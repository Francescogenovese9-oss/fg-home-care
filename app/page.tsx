import Header from "@/components/layout/Header";
import Hero from "@/components/home/Hero";
import CareGuidance from "@/components/home/CareGuidance";
import Services from "@/components/home/Services";
import HowItWorks from "@/components/home/HowItWorks";
import Footer from "@/components/layout/Footer";
import WhyChooseUs from "@/components/home/WhyChooseUs";
import Stats from "@/components/home/Stats";
import Testimonials from "@/components/home/Testimonials";

export default function Home() {
  return (
      <>
  <Header />

    <Hero />
    <CareGuidance />
    <HowItWorks />
    <Services />

  <WhyChooseUs />

  <Stats />

  <Testimonials />

  <Footer />
</>
  );
}



































