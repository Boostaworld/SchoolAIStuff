import React from 'react';
import ChallengeSelector from './ChallengeSelector';
import { TypingChallenge } from '../../types';

/**
 * Example usage of ChallengeSelector component
 *
 * This demonstrates how to integrate the ChallengeSelector
 * into your Orbit OS training module.
 */

const ChallengeSelectorExample: React.FC = () => {
  // Sample challenges data
  const sampleChallenges: TypingChallenge[] = [
    {
      id: '1',
      title: 'Terminal Basics',
      text_content: 'The quick brown fox jumps over the lazy dog. Pack my box with five dozen liquor jugs.',
      difficulty: 'Easy',
      created_at: new Date().toISOString(),
    },
    {
      id: '2',
      title: 'Code Combat',
      text_content: 'function fibonacci(n) { if (n <= 1) return n; return fibonacci(n - 1) + fibonacci(n - 2); } const result = fibonacci(10);',
      difficulty: 'Medium',
      created_at: new Date().toISOString(),
    },
    {
      id: '3',
      title: 'Elite Hacker',
      text_content: 'const asyncHandler = async (req, res, next) => { try { const data = await complexQuery(); return res.json(data); } catch (err) { next(err); } };',
      difficulty: 'Hard',
      created_at: new Date().toISOString(),
    },
    {
      id: '4',
      title: 'Speed Demon',
      text_content: 'Lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.',
      difficulty: 'Easy',
      created_at: new Date().toISOString(),
    },
  ];

  // Handle challenge selection
  const handleChallengeSelect = (challengeId: string) => {
    console.log('Selected challenge:', challengeId);
    // Navigate to typing challenge page or start session
    // Example: navigate(`/training/${challengeId}`);
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
      padding: '2rem'
    }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <h1 style={{
          fontFamily: "'JetBrains Mono', monospace",
          color: 'rgb(103, 232, 249)',
          fontSize: '2rem',
          marginBottom: '2rem',
          textShadow: '0 0 20px rgba(103, 232, 249, 0.3)',
        }}>
          // SELECT YOUR CHALLENGE
        </h1>

        <ChallengeSelector
          challenges={sampleChallenges}
          onSelect={handleChallengeSelect}
        />

        {/* Empty state example */}
        {/* <ChallengeSelector
          challenges={[]}
          onSelect={handleChallengeSelect}
        /> */}
      </div>
    </div>
  );
};

export default ChallengeSelectorExample;
