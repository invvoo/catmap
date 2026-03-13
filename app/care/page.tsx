'use client';

import { useEffect, useRef, useState } from 'react';

export default function CarePage() {
  const [activeSection, setActiveSection] = useState('');
  const sectionsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            (entry.target as HTMLElement).style.opacity = '1';
            (entry.target as HTMLElement).style.transform = 'translateY(0)';
            const id = (entry.target as HTMLElement).dataset.section;
            if (id) setActiveSection(id);
          }
        });
      },
      { threshold: 0.1, rootMargin: '-80px 0px -60% 0px' }
    );
    const els = sectionsRef.current?.querySelectorAll('.fade-in, [data-section]');
    els?.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,wght@0,300;0,600;0,700;1,300;1,600&family=Outfit:wght@300;400;500;600&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        .care-page {
          min-height: 100vh;
          background: #f5f0eb;
          font-family: 'Outfit', sans-serif;
          color: #1e1810;
        }

        /* ── NAV ── */
        .nav {
          position: fixed; top: 0; left: 0; right: 0; z-index: 200;
          padding: 16px 40px;
          display: flex; align-items: center; justify-content: space-between;
          background: rgba(245, 240, 235, 0.94);
          backdrop-filter: blur(10px);
          border-bottom: 1px solid rgba(30,24,16,0.08);
        }
        .nav-logo {
          font-family: 'Fraunces', serif; font-size: 19px; font-weight: 600;
          color: #1e1810; text-decoration: none;
        }
        .nav-links { display: flex; gap: 28px; align-items: center; }
        .nav-link {
          font-size: 13px; font-weight: 400; color: #8a7a68;
          text-decoration: none; letter-spacing: 0.3px; transition: color 0.2s;
        }
        .nav-link:hover, .nav-link.active { color: #1e1810; font-weight: 500; }

        /* ── HERO ── */
        .hero {
          padding: 140px 40px 72px;
          max-width: 860px; margin: 0 auto;
          display: grid; grid-template-columns: 1fr 1fr; gap: 60px; align-items: end;
        }
        .hero-left {}
        .hero-eyebrow {
          font-size: 11px; font-weight: 600; letter-spacing: 3.5px;
          text-transform: uppercase; color: #7a9e7e; margin-bottom: 20px;
        }
        .hero-title {
          font-family: 'Fraunces', serif;
          font-size: clamp(36px, 5vw, 58px);
          font-weight: 700; line-height: 1.08; letter-spacing: -1.5px;
          color: #1e1810; margin-bottom: 24px;
        }
        .hero-title em { font-style: italic; color: #7a9e7e; }
        .hero-subtitle {
          font-size: 16px; line-height: 1.7; color: #5a4e3e; font-weight: 300;
        }
        .hero-right {
          display: flex; flex-direction: column; gap: 14px; padding-bottom: 4px;
        }
        .fund-card {
          background: white; border-radius: 14px; padding: 20px 22px;
          border: 1px solid rgba(30,24,16,0.08);
          box-shadow: 0 2px 12px rgba(30,24,16,0.06);
          cursor: pointer; transition: transform 0.2s, box-shadow 0.2s;
        }
        .fund-card:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(30,24,16,0.1); }
        .fund-card-label { font-size: 11px; font-weight: 600; letter-spacing: 2px; text-transform: uppercase; color: #aaa; margin-bottom: 6px; }
        .fund-card-title { font-family: 'Fraunces', serif; font-size: 17px; font-weight: 600; color: #1e1810; margin-bottom: 4px; }
        .fund-card-desc { font-size: 13px; color: #7a6a58; line-height: 1.5; }
        .fund-card.food .fund-card-dot { background: #e8a855; }
        .fund-card.vet .fund-card-dot { background: #7a9e7e; }
        .fund-card-header { display: flex; align-items: center; gap: 10px; margin-bottom: 6px; }
        .fund-card-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }

        /* ── LAYOUT ── */
        .page-body {
          max-width: 860px; margin: 0 auto;
          padding: 0 40px 120px;
          display: grid; grid-template-columns: 200px 1fr; gap: 60px; align-items: start;
        }

        /* ── STICKY TOC ── */
        .toc {
          position: sticky; top: 90px;
          padding-top: 8px;
        }
        .toc-label { font-size: 10px; font-weight: 600; letter-spacing: 2.5px; text-transform: uppercase; color: #bbb; margin-bottom: 16px; }
        .toc-item {
          display: block; padding: 7px 0 7px 14px;
          font-size: 13px; color: #9a8a78; text-decoration: none;
          border-left: 2px solid transparent; transition: all 0.2s;
          cursor: pointer; background: none; border-top: none; border-right: none; border-bottom: none;
          text-align: left; width: 100%; font-family: 'Outfit', sans-serif;
        }
        .toc-item:hover { color: #1e1810; border-left-color: #c8b89a; }
        .toc-item.active { color: #1e1810; font-weight: 500; border-left-color: #7a9e7e; }

        /* ── CONTENT ── */
        .content { padding-top: 8px; }

        .section {
          margin-bottom: 72px;
          opacity: 0; transform: translateY(20px);
          transition: opacity 0.6s ease, transform 0.6s ease;
        }
        .section.visible { opacity: 1; transform: translateY(0); }

        .section-eyebrow {
          font-size: 10px; font-weight: 600; letter-spacing: 3px;
          text-transform: uppercase; color: #7a9e7e; margin-bottom: 12px;
        }
        .section-title {
          font-family: 'Fraunces', serif; font-size: clamp(24px, 3vw, 32px);
          font-weight: 700; line-height: 1.15; letter-spacing: -0.8px;
          color: #1e1810; margin-bottom: 16px;
        }
        .section-intro {
          font-size: 15px; line-height: 1.75; color: #5a4e3e;
          margin-bottom: 32px; font-weight: 300;
        }
        .section-rule {
          width: 100%; height: 1px; background: rgba(30,24,16,0.1); margin-bottom: 40px;
        }

        /* ── STEPS ── */
        .steps { display: flex; flex-direction: column; gap: 24px; }
        .step {
          display: grid; grid-template-columns: 48px 1fr; gap: 20px; align-items: start;
        }
        .step-num {
          width: 40px; height: 40px; border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          font-family: 'Fraunces', serif; font-size: 17px; font-weight: 700;
          flex-shrink: 0;
        }
        .step-num.food { background: #fef3e0; color: #c87d2a; }
        .step-num.vet  { background: #edf4ee; color: #4a7e52; }
        .step-num.trust { background: #ede9e4; color: #7a6a58; }
        .step-body {}
        .step-title {
          font-family: 'Fraunces', serif; font-size: 17px; font-weight: 600;
          color: #1e1810; margin-bottom: 6px;
        }
        .step-desc { font-size: 14px; line-height: 1.7; color: #6a5a48; font-weight: 300; }
        .step-desc strong { font-weight: 600; color: #3a2c20; }

        /* ── TRUST BADGES ── */
        .trust-grid {
          display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px;
          margin-bottom: 40px;
        }
        .trust-badge {
          background: white; border-radius: 12px; padding: 20px 18px;
          border: 1px solid rgba(30,24,16,0.08);
          box-shadow: 0 2px 8px rgba(30,24,16,0.05);
        }
        .trust-badge-icon { font-size: 24px; margin-bottom: 10px; }
        .trust-badge-title { font-weight: 600; font-size: 14px; color: #1e1810; margin-bottom: 6px; }
        .trust-badge-text { font-size: 13px; color: #7a6a58; line-height: 1.55; font-weight: 300; }

        /* ── DISCLAIMER ── */
        .disclaimer {
          background: #1e1810; border-radius: 14px; padding: 32px 36px; margin-top: 16px;
        }
        .disclaimer-title {
          font-family: 'Fraunces', serif; font-size: 18px; font-weight: 600;
          color: #f5f0eb; margin-bottom: 12px;
        }
        .disclaimer-text { font-size: 14px; line-height: 1.75; color: #c8b89a; font-weight: 300; }
        .disclaimer-text strong { color: #f5f0eb; font-weight: 500; }

        .page-footer {
          text-align: center; padding: 32px; font-size: 13px;
          color: #b0a090; font-family: 'Outfit', sans-serif;
        }

        @media (max-width: 720px) {
          .hero { grid-template-columns: 1fr; padding: 120px 20px 48px; gap: 36px; }
          .hero-right { display: none; }
          .page-body { grid-template-columns: 1fr; padding: 0 20px 80px; }
          .toc { display: none; }
          .trust-grid { grid-template-columns: 1fr; }
          .disclaimer { padding: 24px 20px; }
        }
      `}</style>

      <div className="care-page">

        {/* Nav */}
        <nav className="nav">
          <a href="/" className="nav-logo">🐱 CatMap</a>
          <div className="nav-links">
            <a href="/" className="nav-link">Map</a>
            <a href="/about" className="nav-link">About</a>
            <a href="/care" className="nav-link active">Care for Strays</a>
          </div>
        </nav>

        {/* Hero */}
        <div className="hero">
          <div className="hero-left">
            <div className="hero-eyebrow">Community Program</div>
            <h1 className="hero-title">Care for<br /><em>our strays.</em></h1>
            <p className="hero-subtitle">
              Learn how you can contribute to the well-being of our neighborhood strays — through feeding, vet care, and TNR support, funded by people like you.
            </p>
          </div>
          <div className="hero-right">
            <div className="fund-card food" onClick={() => scrollTo('food-fund')}>
              <div className="fund-card-header">
                <div className="fund-card-dot" />
                <div className="fund-card-label">Program</div>
              </div>
              <div className="fund-card-title">🍽️ Food Fund</div>
              <div className="fund-card-desc">Get reimbursed for feeding a hungry stray.</div>
            </div>
            <div className="fund-card vet" onClick={() => scrollTo('vet-fund')}>
              <div className="fund-card-header">
                <div className="fund-card-dot" />
                <div className="fund-card-label">Program</div>
              </div>
              <div className="fund-card-title">🏥 Vet Care & TNR Fund</div>
              <div className="fund-card-desc">Help sick strays and support trap-neuter-return.</div>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="page-body" ref={sectionsRef}>

          {/* Sticky TOC */}
          <aside className="toc">
            <div className="toc-label">On this page</div>
            {[
              { id: 'how-it-works', label: 'How It Works' },
              { id: 'trust', label: 'Verification' },
              { id: 'food-fund', label: 'Food Fund' },
              { id: 'vet-fund', label: 'Vet Care & TNR' },
              { id: 'fees', label: 'Fees & Disclaimer' },
            ].map(({ id, label }) => (
              <button key={id} className={`toc-item${activeSection === id ? ' active' : ''}`} onClick={() => scrollTo(id)}>
                {label}
              </button>
            ))}
          </aside>

          {/* Content */}
          <div className="content">

            {/* How it works */}
            <section id="how-it-works" className="section fade-in" data-section="how-it-works">
              <div className="section-eyebrow">Overview</div>
              <h2 className="section-title">How It Works</h2>
              <p className="section-intro">
                Our Community Care program is funded by donations from people like you. These funds are used to reimburse community members for food purchases and to cover veterinary expenses for stray cats in need.
              </p>
              <p className="section-intro" style={{ marginBottom: 0 }}>
                The system is built on <strong style={{ color: '#1e1810' }}>community trust and verification</strong> to ensure funds are used appropriately. For key actions, we require multiple community members to verify the situation before funds are released.
              </p>
              <div className="section-rule" style={{ marginTop: 32 }} />
            </section>

            {/* Trust */}
            <section id="trust" className="section fade-in" data-section="trust">
              <div className="section-eyebrow">Integrity</div>
              <h2 className="section-title">Ensuring Trust: Our Verification Process</h2>
              <p className="section-intro">
                To protect community funds and ensure help goes where it's needed, we have a strict verification process.
              </p>
              <div className="trust-grid">
                <div className="trust-badge">
                  <div className="trust-badge-icon">📍</div>
                  <div className="trust-badge-title">Photo Metadata</div>
                  <div className="trust-badge-text">All photos must contain original GPS geotags and timestamps. Our system verifies location and time automatically.</div>
                </div>
                <div className="trust-badge">
                  <div className="trust-badge-icon">👥</div>
                  <div className="trust-badge-title">Community Review</div>
                  <div className="trust-badge-text">No funds are disbursed until multiple trusted community members have reviewed and verified the proof submitted.</div>
                </div>
                <div className="trust-badge">
                  <div className="trust-badge-icon">🤝</div>
                  <div className="trust-badge-title">Be Truthful</div>
                  <div className="trust-badge-text">Fraudulent claims lower your credibility score and may result in a ban. We rely on community honesty.</div>
                </div>
              </div>
              <div className="section-rule" />
            </section>

            {/* Food Fund */}
            <section id="food-fund" className="section fade-in" data-section="food-fund">
              <div className="section-eyebrow">Program 1</div>
              <h2 className="section-title">🍽️ Food Fund: Reimbursement Process</h2>
              <p className="section-intro">Get reimbursed for feeding a hungry stray cat.</p>
              <div className="steps">
                {[
                  {
                    n: '1', title: 'Provide Proof of Purchase & Feeding',
                    desc: 'After purchasing cat food, a caretaker can request reimbursement from their profile page. They must submit a <strong>photo of the receipt</strong> and a <strong>photo of them providing the food</strong> to the cat.'
                  },
                  {
                    n: '2', title: 'Community Verification',
                    desc: 'The reimbursement request will be posted publicly for community review. Once <strong>at least 5 users verify</strong> the proof, your reimbursement will be approved.'
                  },
                  {
                    n: '3', title: 'Get Reimbursed',
                    desc: 'Funds from the community Food Fund will be disbursed to the caretaker. This payment covers the <strong>cost of food and compensates the caretaker</strong> for their service.'
                  },
                ].map((step) => (
                  <div key={step.n} className="step">
                    <div className={`step-num food`}>{step.n}</div>
                    <div className="step-body">
                      <div className="step-title">{step.title}</div>
                      <div className="step-desc" dangerouslySetInnerHTML={{ __html: step.desc }} />
                    </div>
                  </div>
                ))}
              </div>
              <div className="section-rule" style={{ marginTop: 40 }} />
            </section>

            {/* Vet Fund */}
            <section id="vet-fund" className="section fade-in" data-section="vet-fund">
              <div className="section-eyebrow">Program 2</div>
              <h2 className="section-title">🏥 Vet Care Fund & TNR</h2>
              <p className="section-intro">
                Help sick or injured strays get the professional medical attention they need. This also includes funding for TNR programs to help control the stray population humanely.
              </p>
              <div className="steps">
                {[
                  {
                    n: '1', title: 'TNR Bounty: Trap & Transport',
                    desc: 'A bounty from the Vet Care fund is offered to the community member who safely traps and transports the cat to a vet. Claim it by providing <strong>proof of transport</strong> (e.g., a photo at the vet clinic).'
                  },
                  {
                    n: '2', title: 'Submit Vet Bills',
                    desc: 'A caretaker who takes a stray to the vet can request reimbursement by submitting <strong>photos of the vet bill and the cat at the clinic</strong>. This creates a public post for verification.'
                  },
                  {
                    n: '3', title: 'Community Verification',
                    desc: 'Once <strong>at least 5 community members</strong> verify the vet bill and photo, the reimbursement is approved.'
                  },
                  {
                    n: '4', title: 'Cover Vet Bills',
                    desc: 'The donated funds will be used to pay the veterinary bill. The community can <strong>track the cat\'s recovery</strong> through updates on its profile.'
                  },
                ].map((step) => (
                  <div key={step.n} className="step">
                    <div className={`step-num vet`}>{step.n}</div>
                    <div className="step-body">
                      <div className="step-title">{step.title}</div>
                      <div className="step-desc" dangerouslySetInnerHTML={{ __html: step.desc }} />
                    </div>
                  </div>
                ))}
              </div>
              <div className="section-rule" style={{ marginTop: 40 }} />
            </section>

            {/* Fees */}
            <section id="fees" className="section fade-in" data-section="fees">
              <div className="section-eyebrow">Legal</div>
              <h2 className="section-title">Fees & Disclaimer</h2>
              <p className="section-intro">
                To support the platform's operation and development, a small platform fee is deducted from all donations. This ensures we can continue providing this service for our furry neighbors.
              </p>
              <div className="disclaimer">
                <div className="disclaimer-title">⚠️ Demo Application</div>
                <div className="disclaimer-text">
                  Please note that this is a <strong>demo application</strong>, and no real financial transactions will occur. All reimbursement flows, fund balances, and payment disbursements shown are for illustrative purposes only. Do not submit real financial information.
                </div>
              </div>
            </section>

          </div>
        </div>

        <div className="page-footer">Made with love, for every cat in the world. 🐾</div>
      </div>
    </>
  );
}
