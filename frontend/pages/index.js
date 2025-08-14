import Head from "next/head";
import Header from "../components/home/Header";
import Hero from "../components/home/Hero";
import GenerativeAI from "../components/home/GenerativeAI";
import Testimonials from "../components/home/Testimonials";
import FAQ from "../components/home/FAQ";
import Footer from "../components/home/Footer";

export default function Home() {
  return (
    <>
      <Head>
        <title>Fotomorfia - Transformador de estilos de imágenes IA | Generador de Imágenes IA</title>
        <meta name="description" content="Transformador de estilos de imágenes IA que te permite transformar tus imágenes en cualquier estilo que desees. Prueba 100% gratis." />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="keywords" content="editor de fotos, IA, inteligencia artificial, generador de imágenes, diseño, Fotomorfia" />
        <meta name="author" content="Fotomorfia" />
        <meta property="og:title" content="Fotomorfia - Transformador de estilos de imágenes IA" />
        <meta property="og:description" content="Transformador de estilos de imágenes IA que te permite transformar tus imágenes en cualquier estilo que desees. Prueba 100% gratis." />
        <meta property="og:type" content="website" />
        <link rel="icon" href="/favicon.ico" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="true" />
      </Head>
      
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
