-- ============================================
-- ORBIT OS - ARTICLE EXCERPT CHALLENGES
-- ============================================
-- Purpose: Add prose/article challenges for racing
-- Category: Creative, Literature, History, Science (non-code)
-- ============================================
-- Run Date: 2025-11-26
-- ============================================

-- ============================================
-- ARTICLE EXCERPT CHALLENGES
-- ============================================

INSERT INTO public.typing_challenges (title, text_content, difficulty, category, length_type) VALUES

-- ============================================
-- SPRINT (Short article excerpts)
-- ============================================

('Ocean Discovery',
'The vast ocean depths remain largely unexplored, holding secrets that could revolutionize our understanding of life itself.',
'Easy', 'Science', 'Sprint'),

('Creative Mind',
'Creativity flourishes when the mind wanders freely, unbound by conventional thinking and societal expectations.',
'Easy', 'Creative', 'Sprint'),

('Ancient Wisdom',
'Philosophy teaches us to question everything, especially those beliefs we hold most dear and consider self-evident.',
'Medium', 'History', 'Sprint'),

('Space Exploration',
'Humanity''s journey to the stars represents our endless curiosity and determination to explore beyond known boundaries.',
'Easy', 'Science', 'Sprint'),

('Art Perspective',
'True art challenges perception, forcing viewers to reconsider their assumptions about reality and beauty.',
'Medium', 'Creative', 'Sprint'),

-- ============================================
-- MEDIUM (Article paragraphs)
-- ============================================

('Climate Change Impact',
'Rising global temperatures are reshaping ecosystems worldwide, causing unprecedented shifts in weather patterns and threatening biodiversity. Scientists warn that immediate action is necessary to prevent irreversible damage to our planet''s delicate balance. The consequences of inaction extend far beyond environmental concerns, affecting food security, economic stability, and human health across all continents.',
'Medium', 'Science', 'Medium'),

('Digital Revolution',
'The internet has fundamentally transformed how we communicate, work, and access information. What began as a military research project has evolved into an indispensable global infrastructure connecting billions of people. This digital revolution continues to accelerate, bringing both unprecedented opportunities and complex challenges that society must navigate carefully.',
'Medium', 'Technology', 'Medium'),

('Ancient Civilizations',
'The rise and fall of great civilizations offers profound lessons about human nature and societal organization. From the pyramids of Egypt to the temples of Angkor Wat, these ancient cultures achieved remarkable feats that continue to inspire wonder. Their innovations in architecture, mathematics, and governance laid foundations for modern society, demonstrating timeless principles of human ingenuity.',
'Hard', 'History', 'Medium'),

('Mindfulness Practice',
'Meditation and mindfulness have gained widespread recognition in modern psychology for their profound effects on mental health. Research demonstrates that regular practice can reduce stress, improve focus, and enhance emotional regulation. These ancient techniques offer practical tools for navigating the complexities and pressures of contemporary life, promoting overall well-being and resilience.',
'Medium', 'Health', 'Medium'),

('Artistic Expression',
'Art serves as a mirror reflecting society''s values, fears, and aspirations throughout history. Artists challenge conventional thinking, push boundaries, and create dialogues about important social issues. Through various mediums—painting, sculpture, music, literature—creative expression captures the essence of human experience and preserves cultural identity across generations.',
'Medium', 'Creative', 'Medium'),

('Economic Systems',
'Modern economies function through complex interactions between governments, businesses, and consumers. Market forces drive innovation and efficiency, while regulations aim to ensure fairness and stability. Understanding these dynamics is crucial for making informed decisions about policy, investment, and personal finance in an interconnected global marketplace.',
'Hard', 'Economics', 'Medium'),

-- ============================================
-- MARATHON (Long article excerpts)
-- ============================================

('Evolution Theory',
'Charles Darwin''s theory of evolution revolutionized our understanding of life on Earth, explaining how species adapt and change over time through natural selection. His observations during the voyage of the Beagle provided evidence that challenged prevailing beliefs about the origin of species. The theory explains not only biological diversity but also the interconnectedness of all living things. Modern genetics has further confirmed and expanded Darwin''s insights, revealing the molecular mechanisms underlying evolution. Today, evolutionary biology remains central to fields ranging from medicine to ecology, helping us understand everything from antibiotic resistance to conservation strategies. The theory continues to generate new insights as technology enables deeper exploration of life''s complexity.',
'Hard', 'Science', 'Marathon'),

('Renaissance Era',
'The Renaissance marked a pivotal transformation in European culture, spanning roughly from the 14th to 17th centuries. This period witnessed unprecedented achievements in art, science, literature, and philosophy as scholars rediscovered classical knowledge. Artists like Leonardo da Vinci and Michelangelo created masterpieces that still inspire awe today. Thinkers such as Galileo and Copernicus challenged long-held beliefs about the universe, laying groundwork for modern science. The invention of the printing press democratized knowledge, enabling ideas to spread rapidly across continents. Humanism emerged as a dominant intellectual movement, emphasizing individual potential and secular concerns. This cultural flourishing fundamentally reshaped Western civilization, establishing foundations for the modern world.',
'Hard', 'History', 'Marathon'),

('Quantum Mechanics',
'Quantum mechanics represents one of the most successful yet counterintuitive theories in physics. At the subatomic level, particles behave in ways that defy classical physics and everyday intuition. Electrons can exist in multiple states simultaneously, particles can be entangled across vast distances, and observation itself affects outcomes. These strange phenomena have been rigorously verified through countless experiments and enable technologies like transistors, lasers, and quantum computers. Despite its success, quantum mechanics raises profound questions about the nature of reality, causality, and consciousness. Physicists continue to debate interpretations and search for a unified theory that reconciles quantum mechanics with general relativity. The field remains at the frontier of human knowledge.',
'Hard', 'Science', 'Marathon'),

('Literary Analysis',
'Literature provides unique insights into the human condition, exploring themes of love, loss, identity, and meaning across cultures and eras. Great works transcend their time, speaking to universal experiences while reflecting specific historical contexts. Authors employ various techniques—symbolism, metaphor, narrative structure—to create rich layers of meaning. Reading literature develops empathy by immersing us in diverse perspectives and experiences different from our own. Critical analysis reveals how texts reflect and shape cultural values, power dynamics, and social change. From ancient epics to contemporary novels, literary works preserve collective memory and challenge us to examine our assumptions about ourselves and society.',
'Medium', 'Literature', 'Marathon'),

('Global Interconnection',
'Globalization has created an unprecedented level of economic, cultural, and technological interconnection across the world. Advances in transportation and communication enable instant exchange of information, goods, and services across continents. This integration brings both opportunities and challenges: economic growth alongside inequality, cultural exchange alongside homogenization, cooperation alongside competition. Understanding these complex dynamics requires considering multiple perspectives—economic, political, environmental, and social. Nations must balance national interests with global responsibilities, particularly regarding challenges like climate change and pandemics that transcend borders. The future depends on developing frameworks for cooperation that acknowledge both shared humanity and cultural diversity.',
'Hard', 'Economics', 'Marathon');

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Check article challenges were added
SELECT COUNT(*) AS article_count
FROM public.typing_challenges
WHERE category IN ('Science', 'Creative', 'History', 'Health', 'Economics', 'Literature', 'Technology')
  AND title LIKE ANY(ARRAY['%Ocean%', '%Climate%', '%Evolution%', '%Renaissance%', '%Quantum%', '%Literary%', '%Global%', '%Artistic%', '%Mindfulness%']);

-- Expected: 15 rows

-- Verify category distribution
SELECT category, COUNT(*) as count, length_type
FROM public.typing_challenges
WHERE category NOT IN ('Programming', 'Quick Start', 'Speed Training')
GROUP BY category, length_type
ORDER BY category, length_type;

-- Check that Programming challenges still exist
SELECT COUNT(*) as code_challenges
FROM public.typing_challenges
WHERE category = 'Programming';

-- ============================================
-- USAGE NOTES
-- ============================================

/*
CATEGORIES:
- Programming: Code snippets, functions, SQL queries
- Science: Scientific concepts, discoveries, theories
- Creative: Art, creativity, philosophy
- History: Historical events, civilizations, eras
- Literature: Literary analysis, storytelling
- Health: Wellness, mindfulness, psychology
- Economics: Economic systems, markets, policy
- Technology: Digital innovation (prose, not code)

LENGTH TYPES:
- Sprint: < 100 words (quick practice)
- Medium: 100-150 words (standard challenges)
- Marathon: 150+ words (endurance typing)

DIFFICULTY:
- Easy: Common words, simple sentences
- Medium: Complex sentences, varied vocabulary
- Hard: Advanced vocabulary, technical concepts
*/

-- ============================================
-- SUCCESS CONFIRMATION
-- ============================================

-- Run this to confirm deployment:
DO $$
DECLARE
  new_challenges INT;
BEGIN
  SELECT COUNT(*) INTO new_challenges
  FROM public.typing_challenges
  WHERE created_at > NOW() - INTERVAL '1 minute';

  IF new_challenges >= 15 THEN
    RAISE NOTICE '✅ SUCCESS: % article excerpt challenges added', new_challenges;
  ELSE
    RAISE WARNING '⚠️  Expected 15 challenges, found %', new_challenges;
  END IF;
END $$;
