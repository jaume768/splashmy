import SEOHead from "../components/SEOHead";
import Header from "../components/home/Header";
import Hero from "../components/home/Hero";
import GenerativeAI from "../components/home/GenerativeAI";
import Testimonials from "../components/home/Testimonials";
import FAQ from "../components/home/FAQ";
import Footer from "../components/home/Footer";

export default function Home() {
  return (
    <>
      <SEOHead 
        title="Fotomorfia - Transformador de estilos de imágenes IA | Generador de Imágenes IA"
        description="Transformador de estilos de imágenes IA que te permite transformar tus imágenes en cualquier estilo que desees. Prueba 100% gratis."
        keywords="editor de fotos, IA, inteligencia artificial, generador de imágenes, diseño, Fotomorfia, style transfer, transformar imágenes"
        canonical="/"
        ogType="website"
      />
      
      <Header />
      
      <main>
        <Hero />
        <GenerativeAI />
        <Testimonials />
        <FAQ />
      </main>
      
      <Footer />
    </>
  );
}
