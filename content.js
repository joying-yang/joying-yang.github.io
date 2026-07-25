(function () {
  'use strict';

  window.PORTFOLIO_PROJECTS = {
    threshold: {
      slug: 'threshold',
      title: 'Threshold',
      year: '2026',
      role: 'Experience design · Front-end engineering',
      summary: 'A spatial archive that turns a dense collection into a calm, explorable narrative without sacrificing keyboard access.',
      context: 'Digital archives are usually optimized for storage, not orientation. Threshold asks how a collection can feel like a place while remaining fast, readable, and inclusive.',
      constraints: ['Content had to remain available before the visual layer loaded.', 'Navigation needed to work with keyboard, touch, and reduced motion.', 'The scene had to remain stable on mid-range mobile hardware.'],
      decisions: ['Kept semantic HTML as the canonical content source.', 'Authored a small set of deterministic camera poses instead of free-roaming controls.', 'Built visual depth from shared line geometry and a restrained two-color system.'],
      process: 'Mapped the semantic reading path first, proved two spatial stops as a vertical slice, then tuned motion and quality tiers on narrow and wide viewports.',
      result: 'The final prototype preserves the atmosphere of a spatial gallery while every core path remains available in a focused 2D presentation.',
      tech: ['WebGL', 'TypeScript', 'Accessibility', 'Motion'],
    },
    'signal-archive': {
      slug: 'signal-archive',
      title: 'Signal Archive',
      year: '2025',
      role: 'Product design · Systems architecture',
      summary: 'A living research library that gives teams one place to connect observations, decisions, and product evidence.',
      context: 'Research artifacts were scattered across documents, recordings, and chat threads. Useful evidence disappeared at exactly the moment a team needed to make a decision.',
      constraints: ['The system needed to reward lightweight capture rather than perfect documentation.', 'Search results had to expose relationships, not only matching words.', 'Sensitive notes required clear authorship and visibility cues.'],
      decisions: ['Organized the model around signals, decisions, and connected evidence.', 'Designed capture as a three-step flow with useful defaults.', 'Used progressive disclosure to keep complex filtering approachable.'],
      process: 'Started with field-note audits and relationship maps, tested low-fidelity capture flows, and evolved the strongest model into a reusable interface system.',
      result: 'A working system concept that makes the journey from raw observation to defensible decision short, visible, and repeatable.',
      tech: ['React', 'Search', 'Data modeling', 'Design systems'],
    },
    'quiet-hours': {
      slug: 'quiet-hours',
      title: 'Quiet Hours',
      year: '2024',
      role: 'Product strategy · Interface design',
      summary: 'A focused planning tool that translates a noisy week into a small set of humane, achievable commitments.',
      context: 'Most planning tools celebrate volume. Quiet Hours begins with attention instead: what deserves energy, what can wait, and what needs to disappear.',
      constraints: ['The core flow needed to work without an account.', 'Reflection could never feel like another performance metric.', 'The interface had to stay useful with very little data.'],
      decisions: ['Centered the weekly view on three commitments rather than a limitless queue.', 'Stored data locally and explained that choice in plain language.', 'Made completion quiet and reflection optional.'],
      process: 'Reduced the concept to one weekly ritual, tested the language with lightweight prototypes, and built the final flow around local data and resilient defaults.',
      result: 'A compact local-first prototype with an interaction language designed around clarity, recovery, and sustainable momentum.',
      tech: ['Product design', 'React', 'Local-first', 'Testing'],
    },
  };
})();
