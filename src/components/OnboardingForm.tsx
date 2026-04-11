// ============================================================================
// FILE: src/components/OnboardingForm.tsx
// Pustakam AI  -  Contributor Onboarding Form
// Route: /join
// ============================================================================
import React, { useState, useRef, useEffect, useCallback } from 'react';

/* ─── Confetti helper ─── */
function launchConfetti(container: HTMLDivElement) {
  const colors = ['#FECD8C', '#E8B96A', '#1A1A2E', '#2D6A4F', '#ffffff', '#F8F8F8'];
  for (let i = 0; i < 36; i++) {
    const p = document.createElement('div');
    p.className = 'pk-confetti-piece';
    p.style.cssText = `left:${Math.random() * 100}%;top:${Math.random() * 20}%;background:${colors[Math.floor(Math.random() * colors.length)]};animation-delay:${Math.random() * 0.7}s;animation-duration:${0.9 + Math.random() * 0.7}s;transform:rotate(${Math.random() * 360}deg);border-radius:${Math.random() > 0.5 ? '50%' : '3px'};width:${6 + Math.random() * 6}px;height:${6 + Math.random() * 6}px;`;
    container.appendChild(p);
    setTimeout(() => p.remove(), 2500);
  }
}

/* ─── Component ─── */
export default function OnboardingForm() {
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [selectedGender, setSelectedGender] = useState('');
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [showCustomRole, setShowCustomRole] = useState(false);
  const [selectedDuration, setSelectedDuration] = useState('');
  const [selectedHours, setSelectedHours] = useState('');
  const successRef = useRef<HTMLDivElement>(null);

  // Fire confetti on success
  useEffect(() => {
    if (submitted && successRef.current) {
      setTimeout(() => launchConfetti(successRef.current!), 200);
    }
  }, [submitted]);

  const toggleInterest = useCallback((value: string) => {
    setSelectedInterests(prev => {
      const next = prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value];
      if (value === 'Other') setShowCustomRole(!prev.includes(value));
      return next;
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    const form = e.currentTarget;
    const data = new FormData(form);

    // Append pill-selected values that aren't native inputs
    if (selectedGender) data.set('04_gender', selectedGender);
    if (selectedDuration) data.set('25_duration', selectedDuration);
    if (selectedHours) data.set('26_hours', selectedHours);
    data.set('15_interest', selectedInterests.join(', '));

    try {
      const res = await fetch('https://formspree.io/f/mykbrnoy', {
        method: 'POST',
        body: data,
        headers: { Accept: 'application/json' },
      });
      if (res.ok) {
        setSubmitted(true);
      } else {
        setError('Something went wrong. Please try again.');
      }
    } catch {
      setError('Network error. Check your connection and try again.');
    } finally {
      setSubmitting(false);
    }
  };

  /* ─── Pill builder helpers ─── */
  const RadioPill = ({ label, value, group, selected, onSelect }: {
    label: string; value: string; group: string; selected: string; onSelect: (v: string) => void;
  }) => (
    <label
      className={`pk-radio ${selected === value ? 'selected' : ''}`}
      onClick={() => onSelect(value)}
    >
      <input type="radio" name={group} value={value} readOnly checked={selected === value} style={{ display: 'none' }} />
      {label}
    </label>
  );

  const CheckPill = ({ label, value }: { label: string; value: string }) => (
    <label
      className={`pk-check ${selectedInterests.includes(value) ? 'selected' : ''}`}
      onClick={() => toggleInterest(value)}
    >
      <input type="checkbox" name="15_interest" value={value} readOnly checked={selectedInterests.includes(value)} style={{ display: 'none' }} />
      {label}
    </label>
  );

  /* ─── Render ─── */
  return (
    <>
      <style>{`
        /* ─── Onboarding Form Scoped Styles ─── */
        .pk-page { font-family: 'Inter', sans-serif; background: transparent; color: var(--text-primary); min-height: 100vh; padding: 40px 16px 60px; margin: 0; }
        .pk-page *, .pk-page *::before, .pk-page *::after { box-sizing: border-box; }
        .pk-wrap { max-width: 680px; margin: 0 auto; }
        .pk-cover { background: var(--bg-elevated); border-radius: 12px; border: 1px solid var(--border-default); backdrop-filter: blur(16px); padding: 36px 40px; margin-bottom: 20px; box-shadow: 0 16px 40px rgba(0, 0, 0, 0.2); }
        .pk-cover-brand { font-size: 11px; font-weight: 700; letter-spacing: 0.14em; color: var(--brand); text-transform: uppercase; margin-bottom: 8px; }
        .pk-cover h1 { font-size: 26px; font-weight: 700; color: var(--text-primary); margin: 10px 0 6px; }
        .pk-cover p  { font-size: 13.5px; color: var(--text-secondary); line-height: 1.6; }
        .pk-card { background: var(--bg-surface); border-radius: 12px; border: 1px solid var(--border-subtle); backdrop-filter: blur(16px); padding: 28px 32px; margin-bottom: 16px; box-shadow: 0 8px 30px rgba(0,0,0,0.15); }
        .pk-section-header { font-size: 11px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; color: var(--brand); padding-bottom: 8px; border-bottom: 1px solid var(--border-default); margin-bottom: 18px; }
        .pk-row { display: grid; gap: 14px; margin-bottom: 14px; }
        .pk-row.two { grid-template-columns: 1fr 1fr; }
        .pk-row:last-child { margin-bottom: 0; }
        .pk-field { display: flex; flex-direction: column; gap: 6px; }
        .pk-field label.pk-label { font-size: 12px; font-weight: 600; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.04em; }
        .pk-field input, .pk-field select, .pk-field textarea {
          font-family: inherit; font-size: 14px; padding: 11px 14px;
          border: 1px solid var(--border-default); border-radius: 8px; background: rgba(255,255,255,0.03);
          color: var(--text-primary); width: 100%; transition: all 0.2s ease;
          -webkit-appearance: none; appearance: none;
        }
        .pk-field input::placeholder, .pk-field textarea::placeholder { color: var(--text-muted); }
        .pk-field input:focus, .pk-field select:focus, .pk-field textarea:focus {
          outline: none; border-color: var(--brand); background: rgba(255,255,255,0.06);
          box-shadow: 0 0 0 3px rgba(254, 205, 140, 0.15);
        }
        .pk-field select option { background: #111; color: var(--text-primary); }
        .pk-field textarea { resize: vertical; min-height: 90px; line-height: 1.6; }
        .pk-field .hint { font-size: 12px; color: var(--text-muted); }

        .pk-radio-group { display: flex; gap: 10px; flex-wrap: wrap; margin-top: 4px; }
        .pk-radio { display: flex; align-items: center; gap: 8px; cursor: pointer; font-size: 13.5px; color: var(--text-secondary); font-weight: 500;
          padding: 8px 16px; border: 1px solid var(--border-default); border-radius: 24px; background: rgba(255,255,255,0.03);
          transition: all 0.2s ease; user-select: none; }
        .pk-radio input[type=radio] { display: none; }
        .pk-radio:hover { border-color: var(--border-subtle); background: rgba(255,255,255,0.06); color: var(--text-primary); }
        .pk-radio.selected { border-color: var(--brand); background: rgba(254, 205, 140, 0.1); color: var(--brand); box-shadow: 0 0 0 1px var(--brand) inset; }

        .pk-check-group { display: flex; gap: 10px; flex-wrap: wrap; margin-top: 6px; }
        .pk-check { display: flex; align-items: center; gap: 8px; cursor: pointer; font-size: 13.5px; color: var(--text-secondary); font-weight: 500;
          padding: 8px 16px; border: 1px solid var(--border-default); border-radius: 24px; background: rgba(255,255,255,0.03);
          transition: all 0.2s ease; user-select: none; }
        .pk-check input[type=checkbox] { display: none; }
        .pk-check:hover { border-color: var(--border-subtle); background: rgba(255,255,255,0.06); color: var(--text-primary); }
        .pk-check.selected { border-color: var(--brand); background: rgba(254, 205, 140, 0.1); color: var(--brand); box-shadow: 0 0 0 1px var(--brand) inset; }
        .pk-check-hint { font-size: 12px; color: var(--text-muted); margin-top: 10px; display: block; }

        .pk-custom-role-wrap { margin-top: 12px; display: none; }
        .pk-custom-role-wrap.visible { display: block; }

        .pk-submit-card { background: var(--bg-surface); border-radius: 12px; border: 1px solid var(--border-subtle); backdrop-filter: blur(16px); padding: 24px 32px;
          display: flex; align-items: center; gap: 24px; }
        .pk-btn { font-family: inherit; font-size: 13px; font-weight: 800; padding: 10px 28px;
          background: var(--brand); color: #111; border: none; border-radius: 8px; cursor: pointer;
          letter-spacing: 0.02em; transition: all 0.2s ease; white-space: nowrap; }
        .pk-btn:hover { background: var(--brand-hover); transform: translateY(-1px); }
        .pk-btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none; box-shadow: none; }
        .pk-note { font-size: 12px; color: var(--text-muted); }
        .pk-footer { margin-top: 32px; padding-top: 16px; border-top: 1px solid var(--border-default);
          font-size: 12px; font-weight: 600; color: var(--text-muted); text-align: center;
          letter-spacing: 0.08em; text-transform: uppercase; }
        .pk-error { color: #ef4444; font-size: 13px; margin-top: 8px; font-weight: 500; }

        /* Success screen */
        .pk-success { position: relative; overflow: hidden; text-align: center; padding: 80px 24px 70px;
          background: var(--bg-surface); border-radius: 12px; border: 1px solid var(--border-subtle); backdrop-filter: blur(16px); box-shadow: 0 16px 40px rgba(0,0,0,0.2); }
        .pk-success-ring { width: 88px; height: 88px; border-radius: 50%; border: 3px solid rgba(254, 205, 140, 0.2);
          display: flex; align-items: center; justify-content: center; margin: 0 auto 24px;
          animation: pk-ringPop 0.6s cubic-bezier(0.34,1.56,0.64,1) forwards; transform: scale(0); }
        .pk-success-inner { width: 68px; height: 68px; border-radius: 50%; background: rgba(254, 205, 140, 0.1);
          display: flex; align-items: center; justify-content: center; box-shadow: 0 0 20px rgba(254, 205, 140, 0.15); }
        .pk-success-inner svg { width: 30px; height: 30px; stroke: var(--brand); fill: none;
          stroke-width: 2.5; stroke-dasharray: 40; stroke-dashoffset: 40; stroke-linecap: round; stroke-linejoin: round;
          animation: pk-drawCheck 0.5s 0.4s ease forwards; }
        @keyframes pk-ringPop  { to { transform: scale(1); } }
        @keyframes pk-drawCheck { to { stroke-dashoffset: 0; } }
        .pk-success-title { font-size: 28px; font-weight: 700; color: var(--text-primary); opacity: 0;
          transform: translateY(16px); animation: pk-fadeUp 0.6s 0.6s ease forwards; margin-bottom: 12px; letter-spacing: -0.01em; }
        .pk-success-sub { font-size: 15px; color: var(--text-secondary); line-height: 1.6; opacity: 0;
          transform: translateY(12px); animation: pk-fadeUp 0.6s 0.8s ease forwards; }
        .pk-success-badge { display: inline-block; margin-top: 28px; background: rgba(254, 205, 140, 0.1); color: var(--brand); border: 1px solid rgba(254, 205, 140, 0.2);
          font-size: 12px; font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase;
          padding: 8px 24px; border-radius: 24px; opacity: 0; animation: pk-fadeUp 0.6s 1s ease forwards; }
        @keyframes pk-fadeUp { to { opacity: 1; transform: translateY(0); } }

        .pk-confetti-piece { position: absolute; width: 8px; height: 8px; border-radius: 2px; opacity: 0; z-index: 10;
          animation: pk-confettiFall 1.5s ease-out forwards; }
        @keyframes pk-confettiFall {
          0%   { opacity: 1; transform: translateY(-20px) rotate(0deg) scale(1); }
          100% { opacity: 0; transform: translateY(250px) rotate(400deg) scale(0.8); }
        }

        @media (max-width: 520px) {
          .pk-page { padding: 24px 16px 40px; }
          .pk-row.two { grid-template-columns: 1fr; }
          .pk-cover, .pk-card, .pk-submit-card { padding: 24px 20px; }
          .pk-cover h1 { font-size: 24px; }
          .pk-cover p { font-size: 14px; }
          .pk-field label.pk-label { font-size: 11px; }
          .pk-radio, .pk-check { font-size: 13px; padding: 8px 14px; }
          .pk-submit-card { flex-direction: column; align-items: stretch; gap: 16px; text-align: center; }
          .pk-btn { width: 100%; padding: 14px; font-size: 15px; }
          .pk-success { padding: 60px 20px 50px; }
        }
      `}</style>

      <div className="pk-page">
        <div className="pk-wrap">

          {/* Cover */}
          <div className="pk-cover">
            <div className="pk-cover-brand">Pustakam AI � - � OPEN RESEARCH</div>
            <h1>Join the Research Project 🔬</h1>
            <p>Fill in your details to contribute to our open-source research initiative. Takes about 3&nbsp;minutes  -  all fields marked&nbsp;* are required.</p>
          </div>

          {/* ── Form ── */}
          {!submitted && (
            <form onSubmit={handleSubmit}>

              {/* Personal Details */}
              <div className="pk-card">
                <div className="pk-section-header">Personal Details</div>
                <div className="pk-row two">
                  <div className="pk-field"><label className="pk-label">First Name *</label><input type="text" name="01_first_name" placeholder="First name" required /></div>
                  <div className="pk-field"><label className="pk-label">Last Name *</label><input type="text" name="02_last_name" placeholder="Last name" required /></div>
                </div>
                <div className="pk-row two">
                  <div className="pk-field"><label className="pk-label">Date of Birth *</label><input type="date" name="03_dob" required /></div>
                  <div className="pk-field">
                    <label className="pk-label">Gender</label>
                    <div className="pk-radio-group">
                      {['Male', 'Female', 'Other', 'Prefer not to say'].map(g => (
                        <RadioPill key={g} label={g} value={g} group="04_gender" selected={selectedGender} onSelect={setSelectedGender} />
                      ))}
                    </div>
                  </div>
                </div>
                <div className="pk-row two">
                  <div className="pk-field"><label className="pk-label">Nationality *</label><input type="text" name="05_nationality" placeholder="e.g. Indian" required /></div>
                  <div className="pk-field"><label className="pk-label">Languages Spoken</label><input type="text" name="06_languages" placeholder="e.g. English, Hindi" /></div>
                </div>
              </div>

              {/* Contact Information */}
              <div className="pk-card">
                <div className="pk-section-header">Contact Information</div>
                <div className="pk-row">
                  <div className="pk-field"><label className="pk-label">Email Address *</label><input type="email" name="07_email" placeholder="your@email.com" required /></div>
                </div>
                <div className="pk-row two">
                  <div className="pk-field"><label className="pk-label">Phone Number *</label><input type="tel" name="08_phone" placeholder="+91 00000 00000" required /></div>
                  <div className="pk-field"><label className="pk-label">WhatsApp Number</label><input type="tel" name="09_whatsapp" placeholder="If different from above" /></div>
                </div>
                <div className="pk-row two">
                  <div className="pk-field"><label className="pk-label">City *</label><input type="text" name="10_city" placeholder="Your city" required /></div>
                  <div className="pk-field"><label className="pk-label">State / Province</label><input type="text" name="11_state" placeholder="Your state" /></div>
                </div>
              </div>

              {/* Online Presence */}
              <div className="pk-card">
                <div className="pk-section-header">Online Presence</div>
                <div className="pk-row two">
                  <div className="pk-field"><label className="pk-label">LinkedIn</label><input type="url" name="12_linkedin" placeholder="https://linkedin.com/in/..." /></div>
                  <div className="pk-field"><label className="pk-label">GitHub / Portfolio</label><input type="url" name="13_portfolio" placeholder="https://github.com/..." /></div>
                </div>
                <div className="pk-row two">
                  <div className="pk-field"><label className="pk-label">Instagram Handle</label><input type="text" name="14a_instagram" placeholder="@yourhandle" /></div>
                  <div className="pk-field"><label className="pk-label">Twitter / X Handle</label><input type="text" name="14b_twitter" placeholder="@yourhandle" /></div>
                </div>
              </div>

              {/* Academic Background */}
              <div className="pk-card">
                <div className="pk-section-header">Academic Background</div>
                <div className="pk-row two">
                  <div className="pk-field"><label className="pk-label">College / University *</label><input type="text" name="16_college" placeholder="Your university" required /></div>
                  <div className="pk-field"><label className="pk-label">Degree &amp; Field *</label><input type="text" name="17_degree" placeholder="e.g. BA English, BSc Psychology" required /></div>
                </div>
                <div className="pk-row two">
                  <div className="pk-field">
                    <label className="pk-label">Current Year of Study *</label>
                    <select name="18_year" required defaultValue="">
                      <option value="" disabled>Select year</option>
                      <option>1st Year</option><option>2nd Year</option><option>3rd Year</option>
                      <option>4th Year</option><option>Postgraduate</option><option>Recent Graduate</option>
                    </select>
                  </div>
                  <div className="pk-field"><label className="pk-label">Expected Graduation</label><input type="month" name="19_graduation" /></div>
                </div>
              </div>

              {/* Areas of Interest */}
              <div className="pk-card">
                <div className="pk-section-header">Areas of Interest</div>
                <div className="pk-row">
                  <div className="pk-field">
                    <label className="pk-label">What would you like to work on? * (pick all that apply)</label>
                    <div className="pk-check-group">
                      {[
                        'Software Engineering', 'AI / ML', 'Product & Strategy', 'Design / UI-UX',
                        'Community Growth', 'Content & Writing', 'Marketing & Outreach', 'Research',
                      ].map(v => <CheckPill key={v} label={v} value={v} />)}
                      <label
                        className={`pk-check ${selectedInterests.includes('Other') ? 'selected' : ''}`}
                        onClick={() => toggleInterest('Other')}
                      >
                        <input type="checkbox" name="15_interest" value="Other" readOnly checked={selectedInterests.includes('Other')} style={{ display: 'none' }} />
                        Something else
                      </label>
                    </div>
                    <div className={`pk-custom-role-wrap ${showCustomRole ? 'visible' : ''}`}>
                      <input type="text" name="15b_custom_interest" placeholder="Tell us what you'd like to work on..." />
                    </div>
                    <span className="pk-check-hint">Select as many as you like  -  this helps us match you to the right work.</span>
                  </div>
                </div>
              </div>

              {/* About You */}
              <div className="pk-card">
                <div className="pk-section-header">About You</div>
                <div className="pk-row">
                  <div className="pk-field"><label className="pk-label">Your Key Skills *</label><input type="text" name="20_skills" placeholder="e.g. Writing, Research, Canva, Python, Community building..." required /></div>
                </div>
                <div className="pk-row">
                  <div className="pk-field">
                    <label className="pk-label">What are you hoping to build or learn here? *</label>
                    <textarea name="21_goals" placeholder="Share what excites you about Pustakam and what you want to get out of this..." required />
                  </div>
                </div>
                <div className="pk-row">
                  <div className="pk-field">
                    <label className="pk-label">Relevant Projects or Experience</label>
                    <textarea name="22_experience" placeholder="Any past work, clubs, projects, or things you've done that you're proud of..." />
                  </div>
                </div>
                <div className="pk-row">
                  <div className="pk-field">
                    <label className="pk-label">What is the first book you want to create on the platform? Describe it</label>
                    <textarea name="23_first_book" placeholder="Tell us about the learning book you want to generate..." />
                  </div>
                </div>
                <div className="pk-row">
                  <div className="pk-field">
                    <label className="pk-label">A fun fact about you</label>
                    <input type="text" name="24_fun_fact" placeholder="Something that surprises people..." />
                  </div>
                </div>
              </div>

              {/* Availability */}
              <div className="pk-card">
                <div className="pk-section-header">Availability</div>
                <div className="pk-row two">
                  <div className="pk-field"><label className="pk-label">When can you start contributing? *</label><input type="date" name="25b_start_date" required /></div>
                  <div className="pk-field">
                    <label className="pk-label">Commitment Level *</label>
                    <div className="pk-radio-group">
                      {['Casual Contributor', 'Core Contributor', 'Just exploring'].map(d => (
                        <RadioPill key={d} label={d} value={d} group="25_duration" selected={selectedDuration} onSelect={setSelectedDuration} />
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Acknowledgement */}
              <div className="pk-card">
                <div className="pk-section-header">Project Acknowledgement</div>
                <div className="pk-row">
                  <label style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', cursor: 'pointer' }}>
                    <input type="checkbox" name="27_acknowledgement_unpaid_opensource" required style={{ marginTop: '4px', width: '18px', height: '18px', accentColor: '#ef4444' }} />
                    <span style={{ fontSize: '13.5px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                      I understand and agree that Pustakam AI is an <strong>unpaid, open-source research initiative</strong>. I acknowledge that submitting this form and contributing to the project does not constitute formal corporate employment or a commercial business contract. *
                    </span>
                  </label>
                </div>
              </div>

              {/* Submit */}
              <div className="pk-submit-card">
                <button type="submit" className="pk-btn" disabled={submitting}>
                  {submitting ? 'Submitting…' : 'Submit →'}
                </button>
                <span className="pk-note">* Required fields. Your data stays confidential.</span>
              </div>
              {error && <p className="pk-error">{error}</p>}
            </form>
          )}

          {/* ── Success ── */}
          {submitted && (
            <div className="pk-success" ref={successRef}>
              <div className="pk-success-ring">
                <div className="pk-success-inner">
                  <svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12" /></svg>
                </div>
              </div>
              <div className="pk-success-title">Welcome to the Project!</div>
              <div className="pk-success-sub">
                Thanks for your interest.<br />
                We'll be in touch with how you can start contributing.<br />
                Let's build something great. 🚀
              </div>
              <div className="pk-success-badge">Pustakam AI  -  Open Source Contributor</div>
            </div>
          )}

          <div className="pk-footer">Pustakam AI</div>
        </div>
      </div>
    </>
  );
}
