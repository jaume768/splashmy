import Head from "next/head";
import styles from "@/styles/Home.module.css";

export default function Home() {
  return (
    <>
      <Head>
        <title>SplashMy - AI Image Processing</title>
        <meta name="description" content="Transform your images with AI-powered style transfer, editing, and generation" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <div className={styles.page}>
        <header className={styles.header}>
          <div className={styles.logo}>
            <h1>SplashMy</h1>
            <p>AI Image Processing Platform</p>
          </div>
        </header>
        
        <main className={styles.main}>
          <section className={styles.hero}>
            <h2>Transform Your Images with AI</h2>
            <p>Upload, edit, and create stunning images using advanced AI technology</p>
            
            <div className={styles.features}>
              <div className={styles.feature}>
                <h3>🎨 Style Transfer</h3>
                <p>Apply artistic styles to your photos</p>
              </div>
              <div className={styles.feature}>
                <h3>✨ AI Generation</h3>
                <p>Create images from text descriptions</p>
              </div>
              <div className={styles.feature}>
                <h3>🖼️ Image Editing</h3>
                <p>Edit and enhance your images with AI</p>
              </div>
            </div>
            
            <div className={styles.cta}>
              <button className={styles.primaryBtn}>Get Started</button>
              <button className={styles.secondaryBtn}>Learn More</button>
            </div>
          </section>
        </main>
        
        <footer className={styles.footer}>
          <p>&copy; 2025 SplashMy. Powered by AI technology.</p>
        </footer>
      </div>
    </>
  );
}
