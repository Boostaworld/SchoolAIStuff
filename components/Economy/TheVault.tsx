import { useState } from 'react';
import { motion } from 'framer-motion';
import { useOrbitStore } from '@/store/useOrbitStore';
import { supabase } from '@/lib/supabase';
import { toast } from '@/lib/toast';
import { Upload, Lock, Download, FileText, X } from 'lucide-react';

interface VaultFile {
    id: string;
    uploader_id: string;
    file_name: string;
    file_url: string;
    file_type: string;
    file_size: number;
    course_tag: string;
    teacher_name: string;
    unlock_cost: number;
    download_count: number;
    created_at: string;
}

interface VaultUploadData {
    file_name: string;
    course_tag: string;
    teacher_name: string;
    unlock_cost: number;
}

export function TheVault() {
    const { currentUser } = useOrbitStore();
    const [vaultFiles, setVaultFiles] = useState<VaultFile[]>([]);
    const [userAccess, setUserAccess] = useState<string[]>([]); // File IDs user has unlocked
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [selectedCourse, setSelectedCourse] = useState<string>('all');
    const [dragActive, setDragActive] = useState(false);

    async function fetchVaultFiles() {
        try {
            const { data: files } = await supabase
                .from('vault_files')
                .select('id, file_name, file_url, file_type, file_size, course_tag, teacher_name, unlock_cost, download_count, created_at, uploader_id')
                .order('created_at', { ascending: false })
                .limit(50);

            const { data: access } = await supabase
                .from('vault_access')
                .select('file_id')
                .eq('user_id', currentUser?.id || '');

            setVaultFiles(files || []);
            setUserAccess((access || []).map(a => a.file_id));
        } catch (error) {
            console.error('Error fetching vault:', error);
        }
    }

    async function handleUpload(file: File, metadata: VaultUploadData) {
        if (!currentUser) return;

        setUploading(true);
        try {
            // Upload to Supabase Storage
            const fileExt = file.name.split('.').pop();
            const fileName = `${Date.now()}_${file.name}`;
            const filePath = `vault/${currentUser.id}/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('vault-files')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            // Get public URL
            const { data: urlData } = supabase.storage
                .from('vault-files')
                .getPublicUrl(filePath);

            // Create vault file record
            const { error: dbError } = await supabase
                .from('vault_files')
                .insert([{
                    uploader_id: currentUser.id,
                    file_name: metadata.file_name,
                    file_url: urlData.publicUrl,
                    file_type: fileExt || '',
                    file_size: file.size,
                    course_tag: metadata.course_tag,
                    teacher_name: metadata.teacher_name,
                    unlock_cost: metadata.unlock_cost
                }]);

            if (dbError) throw dbError;

            toast.success('File uploaded to vault!');
            setShowUploadModal(false);
            fetchVaultFiles();
        } catch (error: any) {
            console.error('Upload error:', error);
            toast.error(error.message || 'Upload failed');
        } finally {
            setUploading(false);
        }
    }

    async function unlockFile(fileI, cost: number) {
        if (!currentUser) return;

        try {
            // Check user has enough points
            const { data: profile } = await supabase
                .from('profiles')
                .select('orbit_points')
                .eq('id', currentUser.id)
                .single();

            if (!profile || profile.orbit_points < cost) {
                toast.error('Insufficient points!');
                return;
            }

            // Deduct points
            const { error: pointsError } = await supabase
                .from('profiles')
                .update({ orbit_points: profile.orbit_points - cost })
                .eq('id', currentUser.id);

            if (pointsError) throw pointsError;

            // Grant access
            const { error: accessError } = await supabase
                .from('vault_access')
                .insert([{
                    user_id: currentUser.id,
                    file_id: fileId
                }]);

            if (accessError) throw accessError;

            toast.success('File unlocked!');
            fetchVaultFiles();
        } catch (error: any) {
            console.error('Unlock error:', error);
            toast.error(error.message || 'Unlock failed');
        }
    }

    function formatFileSize(bytes: number): string {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    }

    const courses = ['all', ...Array.from(new Set(vaultFiles.map(f => f.course_tag)))];
    const filteredFiles = selectedCourse === 'all'
        ? vaultFiles
        : vaultFiles.filter(f => f.course_tag === selectedCourse);

    return (
        <div className="p-6 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-3xl font-bold flex items-center gap-2">
                        <FileText className="text-purple-500" />
                        The Vault
                    </h1>
                    <p className="text-sm text-slate-400 mt-1">Share study materials, earn points</p>
                </div>
                <button
                    onClick={() => setShowUploadModal(true)}
                    className="px-4 py-2 bg-purple-500 hover:bg-purple-600 rounded-lg font-bold flex items-center gap-2"
                >
                    <Upload size={20} />
                    Upload File
                </button>
            </div>

            {/* Course Filter */}
            <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
                {courses.map(course => (
                    <button
                        key={course}
                        onClick={() => setSelectedCourse(course)}
                        className={`px-4 py-2 rounded-lg whitespace-nowrap transition-colors ${selectedCourse === course
                            ? 'bg-purple-500/20 text-purple-400 border-2 border-purple-500'
                            : 'bg-slate-800 text-slate-400 hover:text-slate-200 border-2 border-transparent'
                            }`}
                    >
                        {course === 'all' ? 'All Courses' : course}
                    </button>
                ))}
            </div>

            {/* File Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredFiles.map(file => {
                    const hasAccess = userAccess.includes(file.id) || file.uploader_id === currentUser?.id;

                    return (
                        <motion.div
                            key={file.id}
                            whileHover={{ scale: 1.02 }}
                            className="p-4 rounded-lg border-2 border-slate-700 bg-slate-800/50 backdrop-blur"
                        >
                            <div className="flex items-start justify-between mb-3">
                                <FileText className="text-purple-400" size={32} />
                                {!hasAccess && (
                                    <div className="px-2 py-1 bg-purple-500/20 text-purple-400 rounded text-xs font-bold flex items-center gap-1">
                                        <Lock size={12} />
                                        {file.unlock_cost} pts
                                    </div>
                                )}
                                {hasAccess && (
                                    <div className="px-2 py-1 bg-green-500/20 text-green-400 rounded text-xs font-bold">
                                        Unlocked
                                    </div>
                                )}
                            </div>

                            <h3 className="text-lg font-bold text-white mb-1">{file.file_name}</h3>
                            <p className="text-sm text-slate-400 mb-2">{file.course_tag}</p>
                            <p className="text-xs text-slate-500 mb-3">
                                {file.teacher_name} • {formatFileSize(file.file_size)}
                            </p>

                            <div className="flex items-center justify-between">
                                <span className="text-xs text-slate-500">
                                    {file.download_count} downloads
                                </span>
                                {hasAccess ? (
                                    <a
                                        href={file.file_url}
                                        download
                                        className="px-3 py-1 bg-green-500/20 text-green-400 hover:bg-green-500/30 rounded flex items-center gap-1"
                                    >
                                        <Download size={16} />
                                        Download
                                    </a>
                                ) : (
                                    <button
                                        onClick={() => unlockFile(file.id, file.unlock_cost)}
                                        className="px-3 py-1 bg-purple-500/20 text-purple-400 hover:bg-purple-500/30 rounded"
                                    >
                                        Unlock
                                    </button>
                                )}
                            </div>
                        </motion.div>
                    );
                })}
            </div>

            {/* Upload Modal */}
            {showUploadModal && (
                <UploadModal
                    onClose={() => setShowUploadModal(false)}
                    onUpload={handleUpload}
                    uploading={uploading}
                />
            )}
        </div>
    );
}

// Upload Modal Component
function UploadModal({
    onClose,
    onUpload,
    uploading
}: {
    onClose: () => void;
    onUpload: (file: File, metadata: VaultUploadData) => void;
    uploading: boolean;
}) {
    const [file, setFile] = useState<File | null>(null);
    const [metadata, setMetadata] = useState<VaultUploadData>({
        file_name: '',
        course_tag: '',
        teacher_name: '',
        unlock_cost: 0
    });
    const [dragActive, setDragActive] = useState(false);

    function handleDrag(e: React.DragEvent) {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === 'dragenter' || e.type === 'dragover') {
            setDragActive(true);
        } else if (e.type === 'dragleave') {
            setDragActive(false);
        }
    }

    function handleDrop(e: React.DragEvent) {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);

        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            const droppedFile = e.dataTransfer.files[0];
            setFile(droppedFile);
            if (!metadata.file_name) {
                setMetadata(prev => ({ ...prev, file_name: droppedFile.name }));
            }
        }
    }

    function handleSubmit() {
        if (!file) {
            toast.error('Please select a file');
            return;
        }
        if (!metadata.file_name || !metadata.course_tag) {
            toast.error('Please fill all required fields');
            return;
        }
        onUpload(file, metadata);
    }

    return (
        <div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50"
            onClick={onClose}
        >
            <div
                className="bg-slate-800 p-6 rounded-lg border-2 border-purple-500 max-w-md w-full mx-4"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-2xl font-bold">Upload to Vault</h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-white">
                        <X size={24} />
                    </button>
                </div>

                {/* Drag-Drop Zone */}
                <div
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                    className={`border-2 border-dashed rounded-lg p-8 mb-4 text-center transition-colors ${dragActive
                        ? 'border-purple-500 bg-purple-500/10'
                        : 'border-slate-600 hover:border-slate-500'
                        }`}
                >
                    <Upload className="mx-auto mb-2 text-slate-400" size={48} />
                    <input
                        type="file"
                        onChange={(e) => {
                            const selectedFile = e.target.files?.[0];
                            if (selectedFile) {
                                setFile(selectedFile);
                                if (!metadata.file_name) {
                                    setMetadata(prev => ({ ...prev, file_name: selectedFile.name }));
                                }
                            }
                        }}
                        className="hidden"
                        id="file-upload"
                    />
                    <label htmlFor="file-upload" className="cursor-pointer">
                        <p className="text-slate-300">
                            {file ? file.name : 'Drag & drop or click to browse'}
                        </p>
                        <p className="text-xs text-slate-500 mt-1">PDF, DOCX, PPTX, etc.</p>
                    </label>
                </div>

                {/* Metadata Form */}
                <div className="space-y-3">
                    <input
                        type="text"
                        placeholder="File Name *"
                        value={metadata.file_name}
                        onChange={(e) => setMetadata(prev => ({ ...prev, file_name: e.target.value }))}
                        className="w-full px-3 py-2 bg-slate-700 rounded border border-slate-600 focus:border-purple-500 outline-none"
                    />
                    <input
                        type="text"
                        placeholder="Course (e.g. MATH101) *"
                        value={metadata.course_tag}
                        onChange={(e) => setMetadata(prev => ({ ...prev, course_tag: e.target.value }))}
                        className="w-full px-3 py-2 bg-slate-700 rounded border border-slate-600 focus:border-purple-500 outline-none"
                    />
                    <input
                        type="text"
                        placeholder="Teacher Name"
                        value={metadata.teacher_name}
                        onChange={(e) => setMetadata(prev => ({ ...prev, teacher_name: e.target.value }))}
                        className="w-full px-3 py-2 bg-slate-700 rounded border border-slate-600 focus:border-purple-500 outline-none"
                    />
                    <input
                        type="number"
                        placeholder="Unlock Cost (points)"
                        value={metadata.unlock_cost === 0 ? '' : metadata.unlock_cost}
                        onChange={(e) => setMetadata(prev => ({ ...prev, unlock_cost: parseInt(e.target.value) || 0 }))}
                        className="w-full px-3 py-2 bg-slate-700 rounded border border-slate-600 focus:border-purple-500 outline-none"
                    />
                </div>

                {/* Submit */}
                <button
                    onClick={handleSubmit}
                    disabled={uploading}
                    className="w-full mt-4 px-4 py-3 bg-purple-500 hover:bg-purple-600 disabled:bg-slate-600 rounded-lg font-bold transition-colors"
                >
                    {uploading ? 'Uploading...' : 'Upload to Vault'}
                </button>
            </div>
        </div>
    );
}
