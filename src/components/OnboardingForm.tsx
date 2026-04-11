// ============================================================================
// FILE: src/components/OnboardingForm.tsx
// Pustakam AI — Intern Onboarding Form
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
    if (selectedGender) data.set('gender', selectedGender);
    if (selectedDuration) data.set('duration', selectedDuration);
    if (selectedHours) data.set('hours', selectedHours);
    data.set('interest', selectedInterests.join(', '));

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
      <input type="radio" name={group} value={value} readOnly checked={selected === value} />
      {label}
    </label>
  );

  const CheckPill = ({ label, value }: { label: string; value: string }) => (
    <label
      className={`pk-check ${selectedInterests.includes(value) ? 'selected' : ''}`}
      onClick={() => toggleInterest(value)}
    >
      <input type="checkbox" name="interest" value={value} readOnly checked={selectedInterests.includes(value)} />
      {label}
    </label>
  );

  /* ─── Render ─── */
  return (
    <>
      <style>{`
        /* ─── Onboarding Form Scoped Styles ─── */
        .pk-page { font-family: Arial, sans-serif; background: #F8F8F8; color: #1A1A1A; min-height: 100vh; padding: 40px 16px 60px; margin: 0; }
        .pk-page *, .pk-page *::before, .pk-page *::after { box-sizing: border-box; }
        .pk-wrap { max-width: 680px; margin: 0 auto; }
        .pk-cover { background: #1A1A2E; border-radius: 10px; padding: 36px 40px; margin-bottom: 20px; }
        .pk-cover-brand { font-size: 11px; font-weight: 700; letter-spacing: 0.14em; color: #FECD8C; text-transform: uppercase; margin-bottom: 8px; }
        .pk-cover h1 { font-size: 26px; font-weight: 700; color: #fff; margin: 10px 0 6px; }
        .pk-cover p  { font-size: 13.5px; color: #AAAAAA; line-height: 1.6; }
        .pk-card { background: #fff; border-radius: 10px; border: 1px solid #E0E0E0; padding: 28px 32px; margin-bottom: 16px; }
        .pk-section-header { font-size: 11px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; color: #1A1A2E; padding-bottom: 8px; border-bottom: 2.5px solid #FECD8C; margin-bottom: 18px; }
        .pk-row { display: grid; gap: 14px; margin-bottom: 14px; }
        .pk-row.two { grid-template-columns: 1fr 1fr; }
        .pk-row:last-child { margin-bottom: 0; }
        .pk-field { display: flex; flex-direction: column; gap: 5px; }
        .pk-field label.pk-label { font-size: 11px; font-weight: 700; color: #444444; text-transform: uppercase; letter-spacing: 0.04em; }
        .pk-field input, .pk-field select, .pk-field textarea {
          font-family: Arial, sans-serif; font-size: 13.5px; padding: 10px 13px;
          border: 1px solid #E0E0E0; border-radius: 6px; background: #F8F8F8;
          color: #1A1A1A; width: 100%; transition: border-color 0.15s, background 0.15s, box-shadow 0.15s;
          -webkit-appearance: none; appearance: none;
        }
        .pk-field input:focus, .pk-field select:focus, .pk-field textarea:focus {
          outline: none; border-color: #1A1A2E; background: #fff;
          box-shadow: 0 0 0 3px rgba(26,26,46,0.08);
        }
        .pk-field textarea { resize: vertical; min-height: 90px; line-height: 1.6; }
        .pk-field .hint { font-size: 11px; color: #888888; }

        .pk-radio-group { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 2px; }
        .pk-radio { display: flex; align-items: center; gap: 6px; cursor: pointer; font-size: 13px; color: #1A1A1A;
          padding: 7px 15px; border: 1px solid #E0E0E0; border-radius: 20px; background: #F8F8F8;
          transition: all 0.15s; user-select: none; }
        .pk-radio input[type=radio] { display: none; }
        .pk-radio.selected { border-color: #1A1A2E; background: #1A1A2E; color: #FECD8C; font-weight: 700; }

        .pk-check-group { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 4px; }
        .pk-check { display: flex; align-items: center; gap: 7px; cursor: pointer; font-size: 13px; color: #1A1A1A;
          padding: 7px 15px; border: 1px solid #E0E0E0; border-radius: 20px; background: #F8F8F8;
          transition: all 0.15s; user-select: none; }
        .pk-check input[type=checkbox] { display: none; }
        .pk-check.selected { border-color: #1A1A2E; background: #1A1A2E; color: #FECD8C; font-weight: 700; }
        .pk-check-hint { font-size: 11px; color: #888; margin-top: 8px; }

        .pk-custom-role-wrap { margin-top: 10px; display: none; }
        .pk-custom-role-wrap.visible { display: block; }

        .pk-submit-card { background: #fff; border-radius: 10px; border: 1px solid #E0E0E0; padding: 24px 32px;
          display: flex; align-items: center; gap: 20px; }
        .pk-btn { font-family: Arial, sans-serif; font-size: 13.5px; font-weight: 700; padding: 12px 32px;
          background: #1A1A2E; color: #FECD8C; border: none; border-radius: 6px; cursor: pointer;
          letter-spacing: 0.03em; transition: opacity 0.15s; white-space: nowrap; }
        .pk-btn:hover { opacity: 0.88; }
        .pk-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .pk-note { font-size: 11.5px; color: #888888; }
        .pk-footer { margin-top: 24px; padding-top: 14px; border-top: 2px solid #FECD8C;
          font-size: 12px; font-weight: 700; color: #1A1A2E; text-align: center;
          letter-spacing: 0.08em; text-transform: uppercase; }
        .pk-error { color: #D32F2F; font-size: 12px; margin-top: 6px; }

        /* Success screen */
        .pk-success { position: relative; overflow: hidden; text-align: center; padding: 70px 24px 60px;
          background: #fff; border-radius: 10px; border: 1px solid #E0E0E0; }
        .pk-success-ring { width: 80px; height: 80px; border-radius: 50%; border: 3px solid #FECD8C;
          display: flex; align-items: center; justify-content: center; margin: 0 auto 20px;
          animation: pk-ringPop 0.5s cubic-bezier(0.34,1.56,0.64,1) forwards; transform: scale(0); }
        .pk-success-inner { width: 62px; height: 62px; border-radius: 50%; background: #1A1A2E;
          display: flex; align-items: center; justify-content: center; }
        .pk-success-inner svg { width: 26px; height: 26px; stroke: #FECD8C; fill: none;
          stroke-width: 2.5; stroke-dasharray: 40; stroke-dashoffset: 40;
          animation: pk-drawCheck 0.4s 0.45s ease forwards; }
        @keyframes pk-ringPop  { to { transform: scale(1); } }
        @keyframes pk-drawCheck { to { stroke-dashoffset: 0; } }
        .pk-success-title { font-size: 24px; font-weight: 700; color: #1A1A2E; opacity: 0;
          transform: translateY(12px); animation: pk-fadeUp 0.5s 0.7s ease forwards; margin-bottom: 10px; }
        .pk-success-sub { font-size: 14px; color: #444444; line-height: 1.7; opacity: 0;
          transform: translateY(10px); animation: pk-fadeUp 0.5s 0.9s ease forwards; }
        .pk-success-badge { display: inline-block; margin-top: 22px; background: #1A1A2E; color: #FECD8C;
          font-size: 11px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase;
          padding: 7px 20px; border-radius: 20px; opacity: 0; animation: pk-fadeUp 0.5s 1.1s ease forwards; }
        @keyframes pk-fadeUp { to { opacity: 1; transform: translateY(0); } }

        .pk-confetti-piece { position: absolute; width: 8px; height: 8px; border-radius: 2px; opacity: 0;
          animation: pk-confettiFall 1.2s ease forwards; }
        @keyframes pk-confettiFall {
          0%   { opacity: 1; transform: translateY(-10px) rotate(0deg); }
          100% { opacity: 0; transform: translateY(200px) rotate(400deg); }
        }

        @media (max-width: 520px) {
          .pk-page { padding: 20px 12px 40px; }
          .pk-row.two { grid-template-columns: 1fr; }
          .pk-cover, .pk-card, .pk-submit-card { padding: 24px 20px; }
          .pk-cover h1 { font-size: 22px; }
          .pk-cover p { font-size: 13px; }
          .pk-field label.pk-label { font-size: 10px; }
          .pk-radio, .pk-check { font-size: 12px; padding: 6px 12px; }
          .pk-submit-card { flex-direction: column; align-items: stretch; gap: 16px; text-align: center; }
          .pk-btn { width: 100%; padding: 14px; }
        }
      `}</style>

      <div className="pk-page">
        <div className="pk-wrap">

          {/* Cover */}
          <div className="pk-cover">
            <div className="pk-cover-brand">Pustakam AI ● INJIN STACK</div>
            <h1>Welcome to the Forge 🔥</h1>
            <p>Fill in your details so we can get you fully set up. Takes about 3&nbsp;minutes — all fields marked&nbsp;* are required.</p>
          </div>

          {/* ── Form ── */}
          {!submitted && (
            <form onSubmit={handleSubmit}>

              {/* Personal Details */}
              <div className="pk-card">
                <div className="pk-section-header">Personal Details</div>
                <div className="pk-row two">
                  <div className="pk-field"><label className="pk-label">First Name *</label><input type="text" name="first_name" placeholder="First name" required /></div>
                  <div className="pk-field"><label className="pk-label">Last Name *</label><input type="text" name="last_name" placeholder="Last name" required /></div>
                </div>
                <div className="pk-row two">
                  <div className="pk-field"><label className="pk-label">Date of Birth *</label><input type="date" name="dob" required /></div>
                  <div className="pk-field">
                    <label className="pk-label">Gender</label>
                    <div className="pk-radio-group">
                      {['Male', 'Female', 'Other', 'Prefer not to say'].map(g => (
                        <RadioPill key={g} label={g} value={g} group="gender" selected={selectedGender} onSelect={setSelectedGender} />
                      ))}
                    </div>
                  </div>
                </div>
                <div className="pk-row two">
                  <div className="pk-field"><label className="pk-label">Nationality *</label><input type="text" name="nationality" placeholder="e.g. Indian" required /></div>
                  <div className="pk-field"><label className="pk-label">Languages Spoken</label><input type="text" name="languages" placeholder="e.g. English, Hindi" /></div>
                </div>
              </div>

              {/* Contact Information */}
              <div className="pk-card">
                <div className="pk-section-header">Contact Information</div>
                <div className="pk-row">
                  <div className="pk-field"><label className="pk-label">Email Address *</label><input type="email" name="email" placeholder="your@email.com" required /></div>
                </div>
                <div className="pk-row two">
                  <div className="pk-field"><label className="pk-label">Phone Number *</label><input type="tel" name="phone" placeholder="+91 00000 00000" required /></div>
                  <div className="pk-field"><label className="pk-label">WhatsApp Number</label><input type="tel" name="whatsapp" placeholder="If different from above" /></div>
                </div>
                <div className="pk-row two">
                  <div className="pk-field"><label className="pk-label">City *</label><input type="text" name="city" placeholder="Your city" required /></div>
                  <div className="pk-field"><label className="pk-label">State / Province</label><input type="text" name="state" placeholder="Your state" /></div>
                </div>
              </div>

              {/* Online Presence */}
              <div className="pk-card">
                <div className="pk-section-header">Online Presence</div>
                <div className="pk-row two">
                  <div className="pk-field"><label className="pk-label">LinkedIn</label><input type="url" name="linkedin" placeholder="https://linkedin.com/in/..." /></div>
                  <div className="pk-field"><label className="pk-label">GitHub / Portfolio</label><input type="url" name="portfolio" placeholder="https://github.com/..." /></div>
                </div>
                <div className="pk-row two">
                  <div className="pk-field"><label className="pk-label">Instagram Handle</label><input type="text" name="instagram" placeholder="@yourhandle" /></div>
                  <div className="pk-field"><label className="pk-label">Twitter / X Handle</label><input type="text" name="twitter" placeholder="@yourhandle" /></div>
                </div>
              </div>

              {/* Academic Background */}
              <div className="pk-card">
                <div className="pk-section-header">Academic Background</div>
                <div className="pk-row two">
                  <div className="pk-field"><label className="pk-label">College / University *</label><input type="text" name="college" placeholder="Your university" required /></div>
                  <div className="pk-field"><label className="pk-label">Degree &amp; Field *</label><input type="text" name="degree" placeholder="e.g. BA English, BSc Psychology" required /></div>
                </div>
                <div className="pk-row two">
                  <div className="pk-field">
                    <label className="pk-label">Current Year of Study *</label>
                    <select name="year" required defaultValue="">
                      <option value="" disabled>Select year</option>
                      <option>1st Year</option><option>2nd Year</option><option>3rd Year</option>
                      <option>4th Year</option><option>Postgraduate</option><option>Recent Graduate</option>
                    </select>
                  </div>
                  <div className="pk-field"><label className="pk-label">Expected Graduation</label><input type="month" name="graduation" /></div>
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
                        <input type="checkbox" name="interest" value="Other" readOnly checked={selectedInterests.includes('Other')} />
                        Something else
                      </label>
                    </div>
                    <div className={`pk-custom-role-wrap ${showCustomRole ? 'visible' : ''}`}>
                      <input type="text" name="custom_interest" placeholder="Tell us what you'd like to work on..." />
                    </div>
                    <span className="pk-check-hint">Select as many as you like — this helps us match you to the right work.</span>
                  </div>
                </div>
              </div>

              {/* About You */}
              <div className="pk-card">
                <div className="pk-section-header">About You</div>
                <div className="pk-row">
                  <div className="pk-field"><label className="pk-label">Your Key Skills *</label><input type="text" name="skills" placeholder="e.g. Writing, Research, Canva, Python, Community building..." required /></div>
                </div>
                <div className="pk-row">
                  <div className="pk-field">
                    <label className="pk-label">What are you hoping to build or learn here? *</label>
                    <textarea name="goals" placeholder="Share what excites you about Pustakam and what you want to get out of this..." required />
                  </div>
                </div>
                <div className="pk-row">
                  <div className="pk-field">
                    <label className="pk-label">Relevant Projects or Experience</label>
                    <textarea name="experience" placeholder="Any past work, clubs, projects, or things you've done that you're proud of..." />
                  </div>
                </div>
                <div className="pk-row">
                  <div className="pk-field">
                    <label className="pk-label">What is the first book you want to create on the platform? Describe it</label>
                    <textarea name="first_book" placeholder="Tell us about the learning book you want to generate..." />
                  </div>
                </div>
                <div className="pk-row">
                  <div className="pk-field">
                    <label className="pk-label">A fun fact about you</label>
                    <input type="text" name="fun_fact" placeholder="Something that surprises people..." />
                  </div>
                </div>
              </div>

              {/* Availability */}
              <div className="pk-card">
                <div className="pk-section-header">Availability</div>
                <div className="pk-row two">
                  <div className="pk-field"><label className="pk-label">Start Date *</label><input type="date" name="start_date" required /></div>
                  <div className="pk-field">
                    <label className="pk-label">Preferred Duration *</label>
                    <div className="pk-radio-group">
                      {['1 Month', '2 Months', '3 Months'].map(d => (
                        <RadioPill key={d} label={d} value={d} group="duration" selected={selectedDuration} onSelect={setSelectedDuration} />
                      ))}
                    </div>
                  </div>
                </div>
                <div className="pk-row">
                  <div className="pk-field">
                    <label className="pk-label">Preferred Working Hours</label>
                    <div className="pk-radio-group">
                      {[
                        { label: 'Morning',   value: 'Morning (6am–12pm)' },
                        { label: 'Afternoon', value: 'Afternoon (12pm–6pm)' },
                        { label: 'Evening',   value: 'Evening (6pm–12am)' },
                        { label: 'Flexible',  value: 'Flexible' },
                      ].map(h => (
                        <RadioPill key={h.value} label={h.label} value={h.value} group="hours" selected={selectedHours} onSelect={setSelectedHours} />
                      ))}
                    </div>
                  </div>
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
              <div className="pk-success-title">You're in the Forge!</div>
              <div className="pk-success-sub">
                Thanks for filling this in.<br />
                We will be in touch with your next steps shortly.<br />
                Let's build something great. 🚀
              </div>
              <div className="pk-success-badge">Pustakam AI — Internship Onboarding</div>
            </div>
          )}

          <div className="pk-footer">Pustakam AI</div>
        </div>
      </div>
    </>
  );
}
