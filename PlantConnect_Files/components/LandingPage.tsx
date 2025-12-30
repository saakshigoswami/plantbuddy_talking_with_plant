
import React from 'react';
import NewHero from './NewHero';
import NewProblemInsight from './NewProblemInsight';
import NewHowItWorks from './NewHowItWorks';
import NewWhyGoogleConfluent from './NewWhyAptos';
import NewFooter from './NewFooter';

interface LandingPageProps {
  onStart: () => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onStart }) => {
  return (
    <div className="min-h-screen bg-[#0f172a]">
      
      <NewHero onStart={onStart} />
      <NewProblemInsight />
      <NewHowItWorks />
      <NewWhyGoogleConfluent />
      <NewFooter onStart={onStart} />

    </div>
  );
};

export default LandingPage;
