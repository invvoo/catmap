// @ts-nocheck
'use client';

import { useEffect, useRef, useState } from 'react';
import Navbar from '../components/Navbar';

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
      { threshold: 0, rootMargin: '0px' }
    );
    const els = sectionsRef.current?.querySelectorAll('[data-section]');
    els?.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const tocItems = [
    { id: 'how-it-works', label: 'How It Works' },
    { id: 'bounty-types', label: 'Bounty Types' },
    { id: 'payout-table', label: 'Payout Table' },
    { id: 'escalation', label: 'Escalation' },
    { id: 'difficulty', label: 'Difficulty Levels' },
    { id: 'claiming', label: 'Claiming Rules' },
    { id: 'proof', label: 'Proof Requirements' },
    { id: 'anti-fraud', label: 'Anti-Fraud' },
    { id: 'boost', label: 'Community Boost' },
    { id: 'funds', label: 'Community Funds' },
    { id: 'fees', label: 'Fees & Terms' },
  ];

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,wght@0,300;0,600;0,700;1,300;1,600&family=Outfit:wght@300;400;500;600&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        .care-page { min-height: 100vh; background: #f5f0eb; font-family: 'Outfit', sans-serif; color: #1e1810; }

        .hero { padding: 72px 40px 72px; max-width: 860px; margin: 0 auto; display: grid; grid-template-columns: 1fr 1fr; gap: 60px; align-items: end; }
        .hero-eyebrow { font-size: 11px; font-weight: 600; letter-spacing: 3.5px; text-transform: uppercase; color: #7a9e7e; margin-bottom: 20px; }
        .hero-title { font-family: 'Fraunces', serif; font-size: clamp(36px, 5vw, 58px); font-weight: 700; line-height: 1.08; letter-spacing: -1.5px; color: #1e1810; margin-bottom: 24px; }
        .hero-title em { font-style: italic; color: #7a9e7e; }
        .hero-subtitle { font-size: 16px; line-height: 1.7; color: #5a4e3e; font-weight: 300; }
        .hero-right { display: flex; flex-direction: column; gap: 14px; padding-bottom: 4px; }
        .fund-card { background: white; border-radius: 14px; padding: 20px 22px; border: 1px solid rgba(30,24,16,0.08); box-shadow: 0 2px 12px rgba(30,24,16,0.06); cursor: pointer; transition: transform 0.2s, box-shadow 0.2s; }
        .fund-card:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(30,24,16,0.1); }
        .fund-card-label { font-size: 11px; font-weight: 600; letter-spacing: 2px; text-transform: uppercase; color: #aaa; margin-bottom: 6px; }
        .fund-card-title { font-family: 'Fraunces', serif; font-size: 17px; font-weight: 600; color: #1e1810; margin-bottom: 4px; }
        .fund-card-desc { font-size: 13px; color: #7a6a58; line-height: 1.5; }
        .fund-card-header { display: flex; align-items: center; gap: 10px; margin-bottom: 6px; }
        .fund-card-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
        .fund-card.food .fund-card-dot { background: #e8a855; }
        .fund-card.vet .fund-card-dot { background: #7a9e7e; }
        .fund-card.bounty .fund-card-dot { background: #FF6B6B; }

        .page-body { max-width: 860px; margin: 0 auto; padding: 0 40px 120px; display: grid; grid-template-columns: 200px 1fr; gap: 60px; align-items: start; }
        .toc { position: sticky; top: 90px; padding-top: 8px; }
        .toc-label { font-size: 10px; font-weight: 600; letter-spacing: 2.5px; text-transform: uppercase; color: #bbb; margin-bottom: 16px; }
        .toc-item { display: block; padding: 7px 0 7px 14px; font-size: 13px; color: #9a8a78; text-decoration: none; border-left: 2px solid transparent; transition: all 0.2s; cursor: pointer; background: none; border-top: none; border-right: none; border-bottom: none; text-align: left; width: 100%; font-family: 'Outfit', sans-serif; }
        .toc-item:hover { color: #1e1810; border-left-color: #c8b89a; }
        .toc-item.active { color: #1e1810; font-weight: 500; border-left-color: #7a9e7e; }

        .content { padding-top: 8px; }
        .section { margin-bottom: 72px; opacity: 0; transform: translateY(16px); transition: opacity 0.5s ease, transform 0.5s ease; }
        .section-eyebrow { font-size: 10px; font-weight: 600; letter-spacing: 3px; text-transform: uppercase; color: #7a9e7e; margin-bottom: 12px; }
        .section-title { font-family: 'Fraunces', serif; font-size: clamp(22px, 3vw, 30px); font-weight: 700; line-height: 1.15; letter-spacing: -0.8px; color: #1e1810; margin-bottom: 16px; }
        .section-intro { font-size: 15px; line-height: 1.75; color: #5a4e3e; margin-bottom: 24px; font-weight: 300; }
        .section-rule { width: 100%; height: 1px; background: rgba(30,24,16,0.1); margin-bottom: 40px; }

        .bounty-card { background: white; border-radius: 14px; padding: 24px 26px; margin-bottom: 20px; border: 1px solid rgba(30,24,16,0.08); box-shadow: 0 2px 10px rgba(30,24,16,0.05); }
        .bounty-card-header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 16px; gap: 12px; }
        .bounty-card-title { font-family: 'Fraunces', serif; font-size: 19px; font-weight: 600; color: #1e1810; }
        .bounty-card-badge { background: #edf4ee; color: #3a7a44; font-size: 11px; font-weight: 700; padding: 4px 10px; border-radius: 20px; white-space: nowrap; flex-shrink: 0; }
        .bounty-card-badge.red { background: #fff0f0; color: #c0392b; }
        .bounty-card-badge.orange { background: #fff8e8; color: #c87d2a; }
        .bounty-card-badge.blue { background: #e8f4ff; color: #1a6fb5; }
        .bounty-meta { display: grid; grid-template-columns: 1fr 1fr; gap: 10px 24px; margin-bottom: 16px; }
        .bounty-meta-item { font-size: 13px; color: #7a6a58; }
        .bounty-meta-item strong { font-weight: 600; color: #1e1810; }
        .bounty-rules { margin-top: 12px; }
        .bounty-rules-title { font-size: 11px; font-weight: 600; letter-spacing: 1.5px; text-transform: uppercase; color: #bbb; margin-bottom: 8px; }
        .bounty-rule { font-size: 13px; color: #6a5a48; line-height: 1.6; padding-left: 14px; position: relative; margin-bottom: 4px; }
        .bounty-rule::before { content: '·'; position: absolute; left: 4px; color: #c8b89a; }

        .payout-table { width: 100%; border-collapse: collapse; font-size: 14px; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 10px rgba(30,24,16,0.06); }
        .payout-table th { background: #1e1810; color: #f5f0eb; padding: 12px 16px; text-align: left; font-weight: 600; font-size: 12px; letter-spacing: 0.5px; }
        .payout-table td { padding: 12px 16px; border-bottom: 1px solid #f0ebe4; color: #3a2c20; }
        .payout-table tr:last-child td { border-bottom: none; }
        .payout-table tr:nth-child(even) td { background: #faf7f3; }

        .escalation-steps { display: flex; flex-direction: column; gap: 0; margin-bottom: 24px; }
        .esc-step { display: flex; gap: 20px; align-items: flex-start; padding: 16px 0; border-bottom: 1px solid rgba(30,24,16,0.07); }
        .esc-step:last-child { border-bottom: none; }
        .esc-dot { width: 10px; height: 10px; border-radius: 50%; background: #7a9e7e; flex-shrink: 0; margin-top: 5px; }
        .esc-text { font-size: 14px; color: #3a2c20; line-height: 1.6; }
        .esc-text strong { font-weight: 600; }

        .diff-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; margin-bottom: 24px; }
        .diff-card { background: white; border-radius: 12px; padding: 18px 16px; border: 1px solid rgba(30,24,16,0.08); box-shadow: 0 2px 8px rgba(30,24,16,0.04); }
        .diff-label { font-size: 10px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; margin-bottom: 8px; }
        .diff-bonus { font-family: 'Fraunces', serif; font-size: 20px; font-weight: 700; color: #1e1810; margin-bottom: 8px; }
        .diff-examples { font-size: 12px; color: #7a6a58; line-height: 1.6; }

        .claim-flow { display: flex; flex-direction: column; gap: 0; counter-reset: step-counter; }
        .claim-step { display: grid; grid-template-columns: 44px 1fr; gap: 16px; align-items: start; padding: 16px 0; border-bottom: 1px solid rgba(30,24,16,0.07); }
        .claim-step:last-child { border-bottom: none; }
        .claim-num { width: 36px; height: 36px; border-radius: 50%; background: #1e1810; color: #f5f0eb; display: flex; align-items: center; justify-content: center; font-family: 'Fraunces', serif; font-size: 16px; font-weight: 700; flex-shrink: 0; }
        .claim-body-title { font-weight: 600; font-size: 14px; color: #1e1810; margin-bottom: 4px; }
        .claim-body-desc { font-size: 13px; color: #6a5a48; line-height: 1.6; font-weight: 300; }

        .proof-block { background: white; border-radius: 12px; padding: 20px 22px; margin-bottom: 14px; border: 1px solid rgba(30,24,16,0.08); }
        .proof-block-title { font-weight: 600; font-size: 15px; color: #1e1810; margin-bottom: 10px; }
        .proof-item { font-size: 13px; color: #6a5a48; line-height: 1.6; padding-left: 16px; position: relative; margin-bottom: 3px; }
        .proof-item::before { content: '✓'; position: absolute; left: 0; color: #7a9e7e; font-size: 11px; font-weight: 700; top: 1px; }

        .fraud-block { margin-bottom: 20px; }
        .fraud-title { font-size: 13px; font-weight: 700; color: #1e1810; margin-bottom: 8px; letter-spacing: 0.3px; }
        .fraud-rule { font-size: 13px; color: #6a5a48; line-height: 1.6; padding-left: 14px; position: relative; margin-bottom: 3px; }
        .fraud-rule::before { content: '—'; position: absolute; left: 0; color: #c8b89a; font-size: 11px; }

        .boost-amounts { display: flex; gap: 12px; flex-wrap: wrap; margin-bottom: 20px; }
        .boost-chip { background: white; border: 1.5px solid rgba(30,24,16,0.12); border-radius: 20px; padding: 8px 20px; font-size: 15px; font-weight: 600; color: #1e1810; font-family: 'Fraunces', serif; }
        .boost-chip.highlight { background: #1e1810; color: #f5f0eb; border-color: #1e1810; }

        .fund-type-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 24px; }
        .fund-type-card { background: white; border-radius: 14px; padding: 24px; border: 1px solid rgba(30,24,16,0.08); box-shadow: 0 2px 10px rgba(30,24,16,0.05); }
        .fund-type-icon { font-size: 28px; margin-bottom: 12px; }
        .fund-type-title { font-family: 'Fraunces', serif; font-size: 16px; font-weight: 600; color: #1e1810; margin-bottom: 6px; }
        .fund-type-desc { font-size: 13px; color: #6a5a48; line-height: 1.65; font-weight: 300; }

        .disclaimer { background: #1e1810; border-radius: 14px; padding: 32px 36px; margin-top: 16px; }
        .disclaimer-title { font-family: 'Fraunces', serif; font-size: 18px; font-weight: 600; color: #f5f0eb; margin-bottom: 12px; }
        .disclaimer-text { font-size: 14px; line-height: 1.75; color: #c8b89a; font-weight: 300; }
        .disclaimer-text strong { color: #f5f0eb; font-weight: 500; }

        .deny-list { margin-top: 12px; }
        .deny-item { font-size: 14px; color: #6a5a48; line-height: 1.7; padding-left: 16px; position: relative; margin-bottom: 4px; }
        .deny-item::before { content: '✗'; position: absolute; left: 0; color: #c0392b; font-size: 11px; font-weight: 700; top: 2px; }

        .page-footer { text-align: center; padding: 32px; font-size: 13px; color: #b0a090; font-family: 'Outfit', sans-serif; }

        @media (max-width: 720px) {
          .hero { grid-template-columns: 1fr; padding: 48px 20px 48px; gap: 36px; }
          .hero-right { display: none; }
          .page-body { grid-template-columns: 1fr; padding: 0 20px 80px; }
          .toc { display: none; }
          .diff-grid { grid-template-columns: repeat(2, 1fr); }
          .fund-type-grid { grid-template-columns: 1fr; }
          .bounty-meta { grid-template-columns: 1fr; }
          .disclaimer { padding: 24px 20px; }
        }
      `}</style>

      <div className="care-page">
        <Navbar />

        {/* Hero */}
        <div className="hero">
          <div className="hero-left">
            <div className="hero-eyebrow">Community Bounty Program</div>
            <h1 className="hero-title">Care for<br /><em>our strays.</em></h1>
            <p className="hero-subtitle">
              Earn real payouts for feeding, TNR, vet transport, and emergency rescue. Every verified action helps a cat in need — and gets you paid for it.
            </p>
          </div>
          <div className="hero-right">
            <div className="fund-card food" onClick={() => scrollTo('bounty-types')}>
              <div className="fund-card-header"><div className="fund-card-dot" style={{ background: '#e8a855' }} /><div className="fund-card-label">Bounty</div></div>
              <div className="fund-card-title">🍽️ Feeding / Colony Check</div>
              <div className="fund-card-desc">$4–$8 per visit. Photo proof required.</div>
            </div>
            <div className="fund-card vet" onClick={() => scrollTo('bounty-types')}>
              <div className="fund-card-header"><div className="fund-card-dot" style={{ background: '#7a9e7e' }} /><div className="fund-card-label">Bounty</div></div>
              <div className="fund-card-title">✂️ TNR Completion</div>
              <div className="fund-card-desc">$60–$100 per cat. Clinic proof required.</div>
            </div>
            <div className="fund-card bounty" onClick={() => scrollTo('bounty-types')}>
              <div className="fund-card-header"><div className="fund-card-dot" style={{ background: '#FF6B6B' }} /><div className="fund-card-label">Bounty</div></div>
              <div className="fund-card-title">🚨 Emergency Rescue</div>
              <div className="fund-card-desc">$50–$100. Fast response strongly encouraged.</div>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="page-body" ref={sectionsRef}>
          <aside className="toc">
            <div className="toc-label">On this page</div>
            {tocItems.map(({ id, label }) => (
              <button key={id} className={`toc-item${activeSection === id ? ' active' : ''}`} onClick={() => scrollTo(id)}>
                {label}
              </button>
            ))}
          </aside>

          <div className="content">

            {/* How It Works */}
            <section id="how-it-works" className="section" data-section="how-it-works">
              <div className="section-eyebrow">Overview</div>
              <h2 className="section-title">How It Works</h2>
              <p className="section-intro">
                CatMap rewards community members for verified care actions — feeding, TNR, vet transport, and emergency rescue. Bounties are funded by the community and paid out after proof is reviewed and approved.
              </p>
              <p className="section-intro">
                The core principles: <strong style={{ color: '#1e1810' }}>pay more for verified outcomes than simple activity</strong>, keep routine tasks affordable, increase payouts over time when tasks go unclaimed, and prevent duplicate or fraudulent claims. Medical costs are reimbursed separately from labor bounties.
              </p>
              <div className="section-rule" style={{ marginTop: 16 }} />
            </section>

            {/* Bounty Types */}
            <section id="bounty-types" className="section" data-section="bounty-types">
              <div className="section-eyebrow">Programs</div>
              <h2 className="section-title">Bounty Types</h2>
              <p className="section-intro">Six bounty types cover the full range of stray cat care.</p>

              {/* 1 Feeding */}
              <div className="bounty-card">
                <div className="bounty-card-header">
                  <div className="bounty-card-title">🍽️ Feeding / Colony Check</div>
                  <div className="bounty-card-badge orange">$4 – $8 / visit</div>
                </div>
                <div className="bounty-meta">
                  <div className="bounty-meta-item"><strong>Covers:</strong> feeding, water refresh, welfare check, photo update</div>
                  <div className="bounty-meta-item"><strong>Base payout:</strong> $4 per visit</div>
                  <div className="bounty-meta-item"><strong>Escalation:</strong> +$1 after 3d · +$1 after 7d · +$2 after 14d</div>
                  <div className="bounty-meta-item"><strong>Max payout:</strong> $8</div>
                </div>
                <div className="bounty-rules">
                  <div className="bounty-rules-title">Rules</div>
                  <div className="bounty-rule">Paid per visit, not per cat</div>
                  <div className="bounty-rule">One payout per colony per scheduled window</div>
                  <div className="bounty-rule">Photo proof required every time</div>
                  <div className="bounty-rule">Visits must meet minimum interval to qualify</div>
                </div>
              </div>

              {/* 2 Colony Care */}
              <div className="bounty-card">
                <div className="bounty-card-header">
                  <div className="bounty-card-title">🏘️ Managed Colony Care</div>
                  <div className="bounty-card-badge">$40 – $60 / month</div>
                </div>
                <div className="bounty-meta">
                  <div className="bounty-meta-item"><strong>Covers:</strong> recurring care, feeding schedule, monitoring, reporting injuries/pregnancies</div>
                  <div className="bounty-meta-item"><strong>Base payout:</strong> $40/month</div>
                  <div className="bounty-meta-item"><strong>Escalation:</strong> +$10 after 14d · +$10 after 30d</div>
                  <div className="bounty-meta-item"><strong>Max payout:</strong> $60/month</div>
                </div>
                <div className="bounty-rules">
                  <div className="bounty-rules-title">Rules</div>
                  <div className="bounty-rule">Caregiver must check in consistently each month</div>
                  <div className="bounty-rule">Missing check-ins can reduce or cancel payout</div>
                  <div className="bounty-rule">Only one active caregiver stipend per colony unless admin approves otherwise</div>
                </div>
              </div>

              {/* 3 TNR */}
              <div className="bounty-card">
                <div className="bounty-card-header">
                  <div className="bounty-card-title">✂️ TNR Completion</div>
                  <div className="bounty-card-badge">$60 – $100 / cat</div>
                </div>
                <div className="bounty-meta">
                  <div className="bounty-meta-item"><strong>Covers:</strong> trap, transport, spay/neuter, return/transfer, documentation</div>
                  <div className="bounty-meta-item"><strong>Base payout:</strong> $60 per cat</div>
                  <div className="bounty-meta-item"><strong>Escalation:</strong> +$10 after 5d · +$10 after 10d · +$20 after 21d</div>
                  <div className="bounty-meta-item"><strong>Max payout:</strong> $100</div>
                </div>
                <div className="bounty-rules">
                  <div className="bounty-rules-title">Rules</div>
                  <div className="bounty-rule">Payout only after verified completion</div>
                  <div className="bounty-rule">Required: clinic paperwork, ear-tip photo if applicable, release/return proof</div>
                  <div className="bounty-rule">One TNR bounty per cat unless admin approves repeat</div>
                </div>
              </div>

              {/* 4 Vet Transport */}
              <div className="bounty-card">
                <div className="bounty-card-header">
                  <div className="bounty-card-title">🚗 Vet Transport / Vet Visit</div>
                  <div className="bounty-card-badge blue">$35 – $60 / trip</div>
                </div>
                <div className="bounty-meta">
                  <div className="bounty-meta-item"><strong>Covers:</strong> trapping, transport, waiting, discharge pickup and return</div>
                  <div className="bounty-meta-item"><strong>Base payout:</strong> $35 per completed trip</div>
                  <div className="bounty-meta-item"><strong>Escalation:</strong> +$10 after 48h · +$15 after 5d</div>
                  <div className="bounty-meta-item"><strong>Max payout:</strong> $60</div>
                </div>
                <div className="bounty-rules">
                  <div className="bounty-rules-title">Rules</div>
                  <div className="bounty-rule">Requires visit completion proof</div>
                  <div className="bounty-rule">Vet bill reimbursed separately if pre-approved</div>
                  <div className="bounty-rule">No labor payout for canceled appointments unless admin approves partial</div>
                </div>
              </div>

              {/* 5 Emergency */}
              <div className="bounty-card">
                <div className="bounty-card-header">
                  <div className="bounty-card-title">🚨 Emergency Rescue</div>
                  <div className="bounty-card-badge red">$50 – $100</div>
                </div>
                <div className="bounty-meta">
                  <div className="bounty-meta-item"><strong>Covers:</strong> visible injury, severe illness, urgent trapping, same-day rescue, clinic dropoff</div>
                  <div className="bounty-meta-item"><strong>Base payout:</strong> $50</div>
                  <div className="bounty-meta-item"><strong>Escalation:</strong> +$25 after 24h · +$25 after 72h</div>
                  <div className="bounty-meta-item"><strong>Max payout:</strong> $100 (admin may raise manually)</div>
                </div>
                <div className="bounty-rules">
                  <div className="bounty-rules-title">Rules</div>
                  <div className="bounty-rule">Requires urgent case proof (photo/video of condition)</div>
                  <div className="bounty-rule">Medical reimbursement is separate from this labor bounty</div>
                </div>
              </div>

              {/* 6 Medical */}
              <div className="bounty-card">
                <div className="bounty-card-header">
                  <div className="bounty-card-title">🏥 Medical Cost Reimbursement</div>
                  <div className="bounty-card-badge">Actual approved cost</div>
                </div>
                <div className="bounty-meta">
                  <div className="bounty-meta-item"><strong>Covers:</strong> exam, treatment, medication, diagnostics, surgery, follow-up</div>
                  <div className="bounty-meta-item"><strong>Payout:</strong> actual approved cost only — no markup</div>
                </div>
                <div className="bounty-rules">
                  <div className="bounty-rules-title">Rules</div>
                  <div className="bounty-rule">Invoice upload required</div>
                  <div className="bounty-rule">Reimbursement covers approved expenses only</div>
                  <div className="bounty-rule">Outside funding must be disclosed — platform pays only unpaid balance</div>
                </div>
              </div>

              <div className="section-rule" style={{ marginTop: 8 }} />
            </section>

            {/* Payout Table */}
            <section id="payout-table" className="section" data-section="payout-table">
              <div className="section-eyebrow">Quick Reference</div>
              <h2 className="section-title">Payout Table</h2>
              <p className="section-intro">Default starting amounts at launch.</p>
              <table className="payout-table">
                <thead>
                  <tr>
                    <th>Task</th>
                    <th>Base Payout</th>
                    <th>Escalation Cap</th>
                  </tr>
                </thead>
                <tbody>
                  <tr><td>🍽️ Feed / Colony Check</td><td>$4 / visit</td><td>$8</td></tr>
                  <tr><td>🏘️ Managed Colony Care</td><td>$40 / month</td><td>$60 / month</td></tr>
                  <tr><td>✂️ TNR Completed</td><td>$60 / cat</td><td>$100</td></tr>
                  <tr><td>🚗 Vet Transport / Visit</td><td>$35 / trip</td><td>$60</td></tr>
                  <tr><td>🚨 Emergency Rescue Intake</td><td>$50</td><td>$100</td></tr>
                  <tr><td>🏥 Medical Reimbursement</td><td>Actual approved cost</td><td>Case-dependent</td></tr>
                </tbody>
              </table>
              <div className="section-rule" style={{ marginTop: 40 }} />
            </section>

            {/* Escalation */}
            <section id="escalation" className="section" data-section="escalation">
              <div className="section-eyebrow">Auto-Escalation</div>
              <h2 className="section-title">Escalation System</h2>
              <p className="section-intro">If a task goes unclaimed, payouts increase over time to attract help.</p>
              <div className="escalation-steps">
                <div className="esc-step"><div className="esc-dot" /><div className="esc-text"><strong>Escalation starts</strong> the moment a bounty is posted.</div></div>
                <div className="esc-step"><div className="esc-dot" /><div className="esc-text"><strong>Escalation pauses</strong> once the bounty is claimed by someone.</div></div>
                <div className="esc-step"><div className="esc-dot" /><div className="esc-text"><strong>Escalation resumes</strong> if the claim expires or is canceled.</div></div>
                <div className="esc-step"><div className="esc-dot" /><div className="esc-text"><strong>Escalation stops</strong> at the bounty cap — it cannot exceed the maximum payout.</div></div>
                <div className="esc-step"><div className="esc-dot" /><div className="esc-text"><strong>Admin override:</strong> admins can manually raise, freeze, or reset escalation at any time.</div></div>
              </div>
              <p className="section-intro" style={{ marginTop: 16, fontSize: 13, color: '#9a8a78' }}>
                Formula: <code style={{ background: '#ede9e4', padding: '2px 8px', borderRadius: 4, fontSize: 12 }}>current = min(base + time_bonus + difficulty_bonus + community_boost, max)</code>
              </p>
              <div className="section-rule" style={{ marginTop: 32 }} />
            </section>

            {/* Difficulty */}
            <section id="difficulty" className="section" data-section="difficulty">
              <div className="section-eyebrow">Modifiers</div>
              <h2 className="section-title">Difficulty Levels</h2>
              <p className="section-intro">Applies mainly to TNR, vet transport, and emergency rescue.</p>
              <div className="diff-grid">
                <div className="diff-card">
                  <div className="diff-label" style={{ color: '#7a9e7e' }}>Easy</div>
                  <div className="diff-bonus">+$0</div>
                  <div className="diff-examples">Friendly cat · easy pickup · short drive · single visit</div>
                </div>
                <div className="diff-card">
                  <div className="diff-label" style={{ color: '#c87d2a' }}>Standard</div>
                  <div className="diff-bonus">+20%</div>
                  <div className="diff-examples">Normal feral handling · standard trap & transport · basic waiting time</div>
                </div>
                <div className="diff-card">
                  <div className="diff-label" style={{ color: '#c0392b' }}>Hard</div>
                  <div className="diff-bonus">+50%</div>
                  <div className="diff-examples">Trap-shy cat · multiple attempts · long-distance · overnight holding</div>
                </div>
                <div className="diff-card">
                  <div className="diff-label" style={{ color: '#8e44ad' }}>Extreme</div>
                  <div className="diff-bonus">Admin sets</div>
                  <div className="diff-examples">Repeated fails · severe injury · dangerous location · complex coordination</div>
                </div>
              </div>
              <div className="section-rule" />
            </section>

            {/* Claiming Rules */}
            <section id="claiming" className="section" data-section="claiming">
              <div className="section-eyebrow">Process</div>
              <h2 className="section-title">Claiming Rules</h2>
              <p className="section-intro">How to claim a bounty and what happens if you don't complete it in time.</p>
              <div className="claim-flow">
                {[
                  ['1', 'See an open bounty', 'Browse bounties on a cat\'s profile page or on the Bounties page.'],
                  ['2', 'Claim the bounty', 'Click Claim — the active window starts immediately.'],
                  ['3', 'Complete the task', 'Feeding/check: 6–12h · Vet transport: same day · TNR: 24–72h · Emergency: 1–6h · Colony care: monthly.'],
                  ['4', 'Upload proof', 'Submit required photos, paperwork, and notes before your window expires.'],
                  ['5', 'Verification', 'Admin reviews and community votes on your submission.'],
                  ['6', 'Get paid', 'Payout released after approval.'],
                ].map(([n, title, desc]) => (
                  <div key={n} className="claim-step">
                    <div className="claim-num">{n}</div>
                    <div>
                      <div className="claim-body-title">{title}</div>
                      <div className="claim-body-desc">{desc}</div>
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 24, background: '#fff8e8', border: '1px solid #f0d090', borderRadius: 12, padding: '16px 20px' }}>
                <div style={{ fontWeight: 600, fontSize: 14, color: '#8a5a00', marginBottom: 6 }}>⏱ Claim Expiration</div>
                <div style={{ fontSize: 13, color: '#7a5a20', lineHeight: 1.7 }}>
                  If you claim a bounty but don't complete it within the active window: the claim expires, the bounty reopens, and escalation resumes. Repeated failures may reduce your trust score or block future claims.
                </div>
              </div>
              <div className="section-rule" style={{ marginTop: 40 }} />
            </section>

            {/* Proof Requirements */}
            <section id="proof" className="section" data-section="proof">
              <div className="section-eyebrow">Documentation</div>
              <h2 className="section-title">Proof Requirements</h2>
              <p className="section-intro">Each bounty type has specific proof requirements. Incomplete submissions will be rejected.</p>

              <div className="proof-block">
                <div className="proof-block-title">🍽️ Feeding / Colony Check</div>
                <div className="proof-item">Photo of food/water setup or cat/colony</div>
                <div className="proof-item">Timestamped submission</div>
                <div className="proof-item">Location confirmation</div>
                <div className="proof-item">Optional short notes</div>
              </div>
              <div className="proof-block">
                <div className="proof-block-title">✂️ TNR</div>
                <div className="proof-item">Before photo if possible</div>
                <div className="proof-item">Trap/transport confirmation</div>
                <div className="proof-item">Clinic paperwork or appointment proof</div>
                <div className="proof-item">After photo or release confirmation</div>
                <div className="proof-item">Ear-tip photo if applicable</div>
              </div>
              <div className="proof-block">
                <div className="proof-block-title">🚗 Vet Visit</div>
                <div className="proof-item">Appointment confirmation or discharge paperwork</div>
                <div className="proof-item">Transport confirmation</div>
                <div className="proof-item">Invoice or summary if reimbursement requested</div>
              </div>
              <div className="proof-block">
                <div className="proof-block-title">🚨 Emergency Rescue</div>
                <div className="proof-item">Photo or video showing urgent condition</div>
                <div className="proof-item">Intake or handoff proof</div>
                <div className="proof-item">Clinic or foster transfer confirmation if applicable</div>
              </div>
              <div className="section-rule" />
            </section>

            {/* Anti-Fraud */}
            <section id="anti-fraud" className="section" data-section="anti-fraud">
              <div className="section-eyebrow">Integrity</div>
              <h2 className="section-title">Anti-Fraud Rules</h2>
              <p className="section-intro">False or duplicate claims result in nonpayment, suspension, or permanent ban.</p>

              <div className="fraud-block">
                <div className="fraud-title">General</div>
                <div className="fraud-rule">One payout per valid completed task</div>
                <div className="fraud-rule">No duplicate claims on the same event</div>
                <div className="fraud-rule">False submissions may result in nonpayment, suspension, or permanent ban</div>
              </div>
              <div className="fraud-block">
                <div className="fraud-title">Feeding Abuse Prevention</div>
                <div className="fraud-rule">Paid per visit or colony, not per cat</div>
                <div className="fraud-rule">Cooldown enforced between paid visits</div>
                <div className="fraud-rule">Proof required each time — no payout for repeated uploads from the same visit</div>
              </div>
              <div className="fraud-block">
                <div className="fraud-title">TNR Abuse Prevention</div>
                <div className="fraud-rule">Unique cat or case ID where possible</div>
                <div className="fraud-rule">No repeated TNR bounty for same cat without admin override</div>
                <div className="fraud-rule">Clinic proof required — no payout for "attempted" TNR unless bounty explicitly includes attempt compensation</div>
              </div>
              <div className="fraud-block">
                <div className="fraud-title">Medical Reimbursement Abuse Prevention</div>
                <div className="fraud-rule">Invoice required, receipts reviewed</div>
                <div className="fraud-rule">Outside funding must be disclosed</div>
                <div className="fraud-rule">Platform pays only unpaid balance if another source already covered part of the bill</div>
              </div>
              <div className="fraud-block">
                <div className="fraud-title">Location Abuse Prevention</div>
                <div className="fraud-rule">One active monthly caregiver per colony</div>
                <div className="fraud-rule">Duplicate colony listings may be merged</div>
                <div className="fraud-rule">Multiple bounty posts for the same cat can be combined into a single case</div>
              </div>
              <div className="section-rule" />
            </section>

            {/* Community Boost */}
            <section id="boost" className="section" data-section="boost">
              <div className="section-eyebrow">Community Feature</div>
              <h2 className="section-title">Community Boost</h2>
              <p className="section-intro">Any user can increase a bounty if a cat has been waiting too long or needs urgent help.</p>
              <div className="boost-amounts">
                <div className="boost-chip">$5</div>
                <div className="boost-chip">$10</div>
                <div className="boost-chip">$25</div>
                <div className="boost-chip highlight">Custom amount</div>
              </div>
              <div className="fraud-block">
                <div className="fraud-title">How It Works</div>
                <div className="fraud-rule">Boosts are added on top of the current bounty — they do not replace proof requirements</div>
                <div className="fraud-rule">Boosted cases are visually highlighted in the feed</div>
                <div className="fraud-rule">Boosts are nonrefundable once the task is completed</div>
                <div className="fraud-rule">If a bounty expires without completion, the boost can remain on the case, transfer to a relisted case, or be refunded as platform credit</div>
              </div>
              <div className="section-rule" />
            </section>

            {/* Community Funds */}
            <section id="funds" className="section" data-section="funds">
              <div className="section-eyebrow">Funding</div>
              <h2 className="section-title">Community Funds</h2>
              <p className="section-intro">
                Bounties don't start with money automatically. When posting a bounty, you choose how to fund it: contribute yourself, request from a community fund, or leave it open for others to boost.
              </p>
              <div className="fund-type-grid">
                <div className="fund-type-card">
                  <div className="fund-type-icon">🌐</div>
                  <div className="fund-type-title">General Community Fund</div>
                  <div className="fund-type-desc">The site's shared pool. Anyone can donate to it. Bounty posters can request disbursements, which are approved by admins. Open to all verified caregivers.</div>
                </div>
                <div className="fund-type-card">
                  <div className="fund-type-icon">🏢</div>
                  <div className="fund-type-title">Organization Funds</div>
                  <div className="fund-type-desc">Rescue groups and individuals can create their own fund, invite their network to contribute, and approve disbursements themselves — without admin involvement.</div>
                </div>
              </div>
              <div style={{ background: '#edf4ee', border: '1px solid #a5d6a7', borderRadius: 12, padding: '16px 20px', marginBottom: 24 }}>
                <div style={{ fontWeight: 600, fontSize: 14, color: '#2e7d32', marginBottom: 6 }}>How to fund a bounty you post</div>
                <div style={{ fontSize: 13, color: '#3a5a3e', lineHeight: 1.7 }}>
                  When you post a bounty, you'll be prompted to: donate directly to seed it, request from the General Community Fund, request from a specific organization fund you have access to, or post it unfunded and let the community boost it over time.
                </div>
              </div>
              <div className="section-rule" />
            </section>

            {/* Fees & Terms */}
            <section id="fees" className="section" data-section="fees">
              <div className="section-eyebrow">Legal</div>
              <h2 className="section-title">Payout Denial & Terms</h2>
              <p className="section-intro">A payout may be denied if any of the following apply:</p>
              <div className="deny-list">
                <div className="deny-item">Proof is missing or insufficient</div>
                <div className="deny-item">Task was not fully completed</div>
                <div className="deny-item">Claim expired before submission</div>
                <div className="deny-item">Task was duplicated or already claimed</div>
                <div className="deny-item">Cat or case identity was misrepresented</div>
                <div className="deny-item">Reimbursement requested without invoice or prior approval</div>
                <div className="deny-item">User violated platform rules</div>
              </div>
              <div className="disclaimer" style={{ marginTop: 32 }}>
                <div className="disclaimer-title">ℹ️ Platform Note</div>
                <div className="disclaimer-text">
                  CatMap is a community-operated platform. Payouts depend on available fund balances. <strong>All reimbursements are subject to admin review and community verification.</strong> Repeated fraudulent submissions result in permanent account suspension. By claiming a bounty, you agree to these terms.
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
