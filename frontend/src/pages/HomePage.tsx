// src/pages/HomePage.tsx

import Hero                from '../components/Hero';
import SkyShieldStatsBar   from '../components/SkyShieldStatsBar';
import SkyShieldValueProps from '../components/SkyShieldValueProps';
import CourseAudienceSection from '../components/CourseAudienceSection';
import SkyShieldHowItWorks from '../components/SkyShieldHowItWorks';
import SuccessStoriesSection from '../components/SuccessStoriesSection';
import SkyShieldInstructors from '../components/SkyShieldInstructors';
import SkyShieldCareerFocus from '../components/SkyShieldCareerFocus';
import ContactSection      from '../components/ContactSection';

export default function HomePage() {
  return (
    <main>
      <Hero />
      <SkyShieldStatsBar />
      <SkyShieldValueProps />
      <CourseAudienceSection />
      <SkyShieldHowItWorks />
      <SuccessStoriesSection />
      <SkyShieldInstructors />
      <SkyShieldCareerFocus />
      <ContactSection />
    </main>
  );
}
