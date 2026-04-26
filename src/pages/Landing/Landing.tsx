import './landing.css';
import './landing-font-override.css';
import { Hero } from './Hero';
import { PainPoints, Features } from './Sections1';
import { Algorithm } from './Algorithm';
import { LivePreview } from './LivePreview';
import { DataSources, FinalCTA } from './Sections2';
import { Footer } from '../../shared/Nav';

export function Landing() {
  return (
    <>
      <Hero />
      <PainPoints />
      <Features />
      <Algorithm />
      <LivePreview />
      <DataSources />
      <FinalCTA />
      <Footer />
    </>
  );
}
