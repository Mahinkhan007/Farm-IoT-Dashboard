import React, { useState, useEffect, useRef } from 'react';
import './LoginPage.css';
import { supabase } from "../lib/supabaseClient"


interface LoginPageProps {
  onLogin?: (email: string, password: string) => void;
}

const LoginPage: React.FC<LoginPageProps> = ({ onLogin: _onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [particles, setParticles] = useState<Array<{ id: number; x: number; delay: number; duration: number; size: number; emoji: string }>>([]);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);

  const farmEmojis = ['🌱', '🌾', '💧', '☀️', '🌿', '🍃', '🌻', '🌊'];

  useEffect(() => {
    const generated = Array.from({ length: 18 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      delay: Math.random() * 8,
      duration: 6 + Math.random() * 8,
      size: 0.8 + Math.random() * 1.2,
      emoji: farmEmojis[Math.floor(Math.random() * farmEmojis.length)],
    }));
    setParticles(generated);
  }, []);

// login code

const handleLogin = async () => {
  setIsLoading(true)
  setError("")

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    setError(error.message)
  } else {
    console.log("Logged in:", data)
    window.location.href = "/dashboard"
  }

  setIsLoading(false)
}



  // Animated canvas — flowing field lines
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    let t = 0;

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Subtle flowing field lines
      for (let row = 0; row < 12; row++) {
        ctx.beginPath();
        ctx.strokeStyle = `rgba(0, 82, 165, ${0.03 + row * 0.005})`;
        ctx.lineWidth = 1;
        const y = (canvas.height / 12) * row + 40;
        ctx.moveTo(0, y);
        for (let x = 0; x < canvas.width; x += 4) {
          const wave = Math.sin(x * 0.01 + t + row * 0.5) * 18 + Math.sin(x * 0.005 + t * 0.7) * 10;
          ctx.lineTo(x, y + wave);
        }
        ctx.stroke();
      }

      // Floating dots
      for (let i = 0; i < 30; i++) {
        const x = ((i * 137.5 + t * 20) % canvas.width);
        const y = (Math.sin(i * 0.8 + t * 0.5) * 80 + canvas.height / 2 + i * 22) % canvas.height;
        ctx.beginPath();
        ctx.arc(x, y, 1.5, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(0, 82, 165, 0.12)`;
        ctx.fill();
      }

      t += 0.008;
      animFrameRef.current = requestAnimationFrame(draw);
    };

    draw();
    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animFrameRef.current);
    };
  }, []);


  return (
    <div className="lp-root">
      {/* Animated canvas background */}
      <canvas ref={canvasRef} className="lp-canvas" />

      {/* Floating farm emoji particles */}
      <div className="lp-particles" aria-hidden="true">
        {particles.map(p => (
          <span
            key={p.id}
            className="lp-particle"
            style={{
              left: `${p.x}%`,
              animationDelay: `${p.delay}s`,
              animationDuration: `${p.duration}s`,
              fontSize: `${p.size}rem`,
            }}
          >
            {p.emoji}
          </span>
        ))}
      </div>

      {/* Header bar */}
      <header className="lp-header">
        <img src="/mmu_logo.png" alt="MMU Logo" className="lp-logo-mmu" />
        <img src="/ict_logo.jpg" alt="ICT Virtual Organisation of ASEAN" className="lp-logo-ict" />
      </header>

      {/* Main content */}
      <main className="lp-main">
        {/* Hero title section */}
        <section className="lp-hero">
          <div className="lp-hero-text">
            <div className="lp-badge">🌿 ASEAN IVO Smart Agriculture Initiative</div>
            <h1 className="lp-title">
              <span className="lp-title-mmu">MMU</span>
              <span className="lp-title-smart"> Smart</span>
              <span className="lp-title-farm"> Farm</span>
            </h1>
            <p className="lp-subtitle">
              PROGRAM PENYELIDIKAN TRANSLASIONAL
            </p>
            <p className="lp-description">
             Sustainable Energy Solutions for Enhancing Societal Wellbeing and Resilient Future of Rural Communities <br></br>

IoT-Assisted Smart Agriculture Plot Prototype with Integrated Photovoltaic-Battery Renewable Energy System </p> 
<p className="lp-subtitle">
Asean IVO Collaborative Research And Development </p> 
On 
<p className="lp-description">
AI-Driven Smart Horticulture for Climate Sensitive Plant using Soil Analysis and Image Processing: A Tropical Perspective <br></br>
</p>
<p className="lp-description2">Ketua Penyelidik (IPT): Dr. Lee It Ee </p>
            

            <div className="lp-stats">
              <div className="lp-stat">
                <span className="lp-stat-num">3</span>
                <span className="lp-stat-label">Farms</span>
              </div>
              <div className="lp-stat-divider" />
              <div className="lp-stat">
                <span className="lp-stat-num">24/7</span>
                <span className="lp-stat-label">Live Monitoring</span>
              </div>
              <div className="lp-stat-divider" />
              <div className="lp-stat">
                <span className="lp-stat-num">ESP32</span>
                <span className="lp-stat-label">IoT Nodes</span>
              </div>
            </div>
          </div>

          {/* Bee mascot */}
          <div className="lp-bee-container">
            <div className="lp-bee-glow" />
            <img src="/mmu_bee.jpg" alt="MMU Bee Mascot - Smart Farmer" className="lp-bee" />
            <div className="lp-bee-hat">👒</div>
            <div className="lp-bee-speech">Selamat datang,<br/>petani pintar! 🌾</div>
          </div>
        </section>

        {/* Login card */}
        <section className="lp-card-section">
          <div className="lp-card">
            <div className="lp-card-accent" />
            <div className="lp-card-inner">
              <div className="lp-card-icon">🔐</div>
              <h2 className="lp-card-title">Log Masuk</h2>
              <p className="lp-card-sub">Akses selamat ke papan pemuka ladang</p>

              {error && (
                <div className="lp-error">
                  <span>⚠️ {error}</span>
                </div>
              )}

              <form onSubmit={(e) => {
  e.preventDefault()
  handleLogin()
}}>
                <div className="lp-field">
                  <label className="lp-label" htmlFor="email">Emel</label>
                  <div className="lp-input-wrap">
                    <span className="lp-input-icon">✉️</span>
                    <input
                      id="email"
                      type="email"
                      className="lp-input"
                      placeholder="nama@mmu.edu.my"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      autoComplete="email"
                    />
                  </div>
                </div>

                <div className="lp-field">
                  <label className="lp-label" htmlFor="password">Kata Laluan</label>
                  <div className="lp-input-wrap">
                    <span className="lp-input-icon">🔒</span>
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      className="lp-input"
                      placeholder="••••••••"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      className="lp-eye"
                      onClick={() => setShowPassword(v => !v)}
                      aria-label="Toggle password"
                    >
                      {showPassword ? '🙈' : '👁️'}
                    </button>
                  </div>
                </div>

                <button  onClick={handleLogin} type="submit" className={`lp-btn${isLoading ? ' lp-btn--loading' : ''}`} disabled={isLoading}>
                  {isLoading ? (
                    <span className="lp-spinner-wrap">
                      <span className="lp-spinner" />
                      <span>Mengesahkan...</span>
                    </span>
                  ) : (
                    <span>Masuk ke Sistem 🌱</span>
                  )}
                </button>
                {error && <p>{error}</p>}
              </form>

              <p className="lp-forgot">Access restricted. <a href="#reset" className="lp-link">Contact Admin</a> to get an account. </p>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="lp-footer">
        <p className="lp-footer-label">Dengan kolaborasi:</p>
        <div className="lp-footer-logos">
          <img src="/kpm_logo.png" alt="Kementerian Pendidikan Malaysia" className="lp-footer-logo" />
          <img src="/jpt_logo.png" alt="JPT" className="lp-footer-logo lp-footer-logo--dark" />
          <img src="/meme_logo.jpg" alt="MEME" className="lp-footer-logo lp-footer-logo--round" />
          <img src="/cambodia_logo.png" alt="Cambodia University" className="lp-footer-logo" />
          <img src="/laos_logo.png" alt="Laos University" className="lp-footer-logo" />
          <img src="/brunei_logo.png" alt="Universiti Teknologi Brunei" className="lp-footer-logo" />
        </div>
        <p className="lp-footer-copy">
          © {new Date().getFullYear()} Multimedia University · Cyberjaya, Malaysia · ASEAN IVO Collaborative Initiative
        </p>
      </footer>
    </div>
  );
};

export default LoginPage;
