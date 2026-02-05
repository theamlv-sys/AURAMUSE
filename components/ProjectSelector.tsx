import React from 'react';
import { ProjectType } from '../types';

interface ProjectSelectorProps {
  onSelect: (type: ProjectType) => void;
}

const CARDS = [
  { type: ProjectType.NOVEL, title: 'Novel', desc: 'Write the next bestseller. Deep POV & Plot.', icon: '📖' },
  { type: ProjectType.SCREENPLAY, title: 'Screenplay', desc: 'Movies & TV. Industry standard format.', icon: '🎬' },
  { type: ProjectType.YOUTUBE, title: 'YouTube Script', desc: 'Viral hooks, engagement retention.', icon: '📹' },
  { type: ProjectType.ESSAY, title: 'Essay / Report', desc: 'Academic rigor, clear structure.', icon: '🎓' },
  { type: ProjectType.CHILDRENS_BOOK, title: "Children's Book", desc: 'Magical stories for young minds.', icon: '🧸' },
  { type: ProjectType.EMAIL, title: 'Professional Email', desc: 'Persuasive, clear, and high-impact.', icon: '📧' },
  { type: ProjectType.TECHNICAL, title: 'Technical Docs', desc: 'Manuals, API docs, whitepapers.', icon: '⚙️' },
  { type: ProjectType.LYRICS, title: 'Lyrics & Poetry', desc: 'Songwriting, rhyme schemes, flow.', icon: '🎵' },
  { type: ProjectType.GENERAL, title: 'General Creative', desc: 'Freestyle writing & brainstorming.', icon: '✨' },
];

const ProjectSelector: React.FC<ProjectSelectorProps> = ({ onSelect }) => {
  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-8 overflow-y-auto">
      <div className="text-center mb-12 mt-10">
        <h1 className="text-5xl font-serif font-bold text-white mb-4 tracking-tight">Muse</h1>
        <p className="text-gray-400 text-lg max-w-2xl mx-auto">
          The ultimate AI writing assistant. Human nuance, infinite creativity.
          Select your canvas to begin.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl w-full pb-12">
        {CARDS.map((card) => (
          <button
            key={card.type}
            onClick={() => onSelect(card.type)}
            className="group relative bg-gray-850 border border-gray-750 p-8 rounded-2xl hover:border-muse-500 hover:shadow-2xl hover:shadow-muse-500/10 transition-all duration-300 text-left flex flex-col h-64"
          >
            <div className="text-4xl mb-4 bg-gray-800 w-16 h-16 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
              {card.icon}
            </div>
            <h3 className="text-2xl font-bold text-white mb-2 group-hover:text-muse-400 transition-colors">
              {card.title}
            </h3>
            <p className="text-gray-400 group-hover:text-gray-300">
              {card.desc}
            </p>
            <div className="mt-auto opacity-0 group-hover:opacity-100 transition-opacity text-muse-500 font-medium flex items-center">
              Start Writing <span className="ml-2">→</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default ProjectSelector;