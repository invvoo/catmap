'use client';

import Navbar from '../components/Navbar';

export default function AboutPage() {

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400;0,600;1,400;1,600&family=DM+Sans:wght@300;400;500&display=swap');

        * { box-sizing: border-box; margin: 0; padding: 0; }

        body { background: #faf7f2; }

        .about-page {
          min-height: 100vh;
          background: #faf7f2;
          font-family: 'DM Sans', sans-serif;
          color: #2a2018;
        }

        .hero {
          padding: 72px 40px 80px;
          max-width: 780px;
          margin: 0 auto;
        }

        .hero-eyebrow {
          font-family: 'DM Sans', sans-serif;
          font-size: 11px;
          font-weight: 500;
          letter-spacing: 3px;
          text-transform: uppercase;
          color: #c4855a;
          margin-bottom: 24px;
        }

        .hero-title {
          font-family: 'Lora', serif;
          font-size: clamp(42px, 6vw, 72px);
          font-weight: 600;
          line-height: 1.1;
          letter-spacing: -1.5px;
          color: #2a2018;
          margin-bottom: 32px;
        }

        .hero-title em {
          font-style: italic;
          color: #c4855a;
        }

        .hero-rule {
          width: 60px;
          height: 2px;
          background: #c4855a;
          margin-bottom: 48px;
        }

        .content {
          max-width: 780px;
          margin: 0 auto;
          padding: 0 40px 120px;
        }

        .story-paragraph {
          font-family: 'Lora', serif;
          font-size: clamp(17px, 2vw, 20px);
          line-height: 1.85;
          color: #3a2c20;
          margin-bottom: 36px;
          font-weight: 400;
        }

        .story-paragraph em {
          font-style: italic;
          color: #2a2018;
        }

        .story-paragraph strong {
          font-weight: 600;
        }

        .pull-quote {
          border-left: 3px solid #c4855a;
          padding: 8px 0 8px 32px;
          margin: 52px 0;
          font-family: 'Lora', serif;
          font-size: clamp(20px, 3vw, 26px);
          font-style: italic;
          line-height: 1.6;
          color: #2a2018;
          letter-spacing: -0.3px;
        }

        .cat-divider {
          text-align: center;
          font-size: 28px;
          margin: 56px 0;
          opacity: 0.5;
          letter-spacing: 16px;
        }

        .footer-cta {
          margin-top: 72px;
          padding: 52px 48px;
          background: #2a2018;
          border-radius: 16px;
          text-align: center;
        }

        .footer-cta-text {
          font-family: 'Lora', serif;
          font-size: clamp(20px, 2.5vw, 26px);
          color: #faf7f2;
          line-height: 1.5;
          margin-bottom: 28px;
          font-style: italic;
        }

        .footer-cta-btn {
          display: inline-block;
          padding: 14px 32px;
          background: #c4855a;
          color: white;
          text-decoration: none;
          border-radius: 8px;
          font-family: 'DM Sans', sans-serif;
          font-weight: 500;
          font-size: 15px;
          letter-spacing: 0.3px;
          transition: background 0.2s, transform 0.15s;
        }

        .footer-cta-btn:hover {
          background: #b3744a;
          transform: translateY(-1px);
        }

        .page-footer {
          text-align: center;
          padding: 32px;
          font-size: 13px;
          color: #b0a090;
          font-family: 'DM Sans', sans-serif;
        }

        @media (max-width: 600px) {
          .hero { padding: 48px 20px 60px; }
          .content { padding: 0 20px 80px; }
          .footer-cta { padding: 36px 24px; }
          .pull-quote { padding-left: 20px; }
        }
      `}</style>

      <div className="about-page">
        <Navbar />

        <div className="hero">
          <div className="hero-eyebrow">Our Story</div>
          <h1 className="hero-title">
            One walk,<br />
            <em>one cat,</em><br />
            at a time.
          </h1>
          <div className="hero-rule" />
        </div>

        <div className="content">

          <p className="story-paragraph">
            My wife has always had this huge, impossible-in-the-best-way dream — <em>give every cat in the world care.</em>
          </p>

          <p className="story-paragraph">
            One of our favorite things to do is a simple, daily ritual: going on walks and hoping for cat sightings. On our walks and our drives, we look for our familiar faces — the <strong>window cats</strong> perched like tiny landlords, and the strays who slip through the neighborhood like little shadows.
          </p>

          <div className="pull-quote">
            "We've given each of them our own names because we cared about our little neighbors, and it's just the best thing when we happen upon them."
          </div>

          <p className="story-paragraph">
            Of course, some already probably have homes and real names we didn't know — but that didn't stop them from being part of our daily story.
          </p>

          <div className="cat-divider">🐾 🐱 🐾</div>

          <p className="story-paragraph">
            That's what this site is for. It's a place to <strong>enjoy cats together as a community</strong> — to tag a sighting, leave a comment like <em>"I know him, too! I call him Acorn"</em> and share that tiny spark of joy that comes from noticing them.
          </p>

          <p className="story-paragraph">
            It's also a way to gently turn love into care: helping neighbors coordinate, supporting TNR efforts, and looking out for the community cats so fewer are left behind.
          </p>

          <p className="story-paragraph">
            Because dreams don't come true all at once. Sometimes they come true <em>one walk at a time</em> — one cat, one sighting, one small act of care, together.
          </p>

          <div className="footer-cta">
            <p className="footer-cta-text">
              "To share in the love of our little neighbor on the corner."
            </p>
            <a href="/" className="footer-cta-btn">🐱 Find cats near you →</a>
          </div>
        </div>

        <div className="page-footer">
          Made with love, for every cat in the world. 🐾
        </div>
      </div>
    </>
  );
}