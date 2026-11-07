
import React, { useEffect } from 'react';
import { Icon } from './Icon';
import { faArrowLeft } from '@fortawesome/free-solid-svg-icons';
import { SMS_ORGANIZATION } from '../lib/sms';

interface PrivacyPageProps {
  onBack: () => void;
}

export const PrivacyPage: React.FC<PrivacyPageProps> = ({ onBack }) => {
  // This page loads lazily after the app scrolls to the top, so jump to a linked section (#sms-terms) ourselves.
  useEffect(() => {
    const id = window.location.hash.slice(1);
    if (!id) return;
    const frame = requestAnimationFrame(() => document.getElementById(id)?.scrollIntoView());
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <div className="bg-white pt-40 lg:pt-32 pb-24">
      <div className="container mx-auto px-4 max-w-4xl">
        <button 
          onClick={onBack}
          className="mb-8 text-[#311b92] font-bold uppercase tracking-widest flex items-center gap-2 hover:text-teal-600 transition-colors"
        >
          <Icon icon={faArrowLeft} /> Back to Home
        </button>
        
        <h1 className="text-4xl md:text-5xl font-black text-[#311b92] mb-8 uppercase italic tracking-tighter">
          Privacy Policy
        </h1>
        
        <div className="prose prose-lg max-w-none text-gray-700 space-y-6 leading-relaxed">
          <p className="font-semibold text-gray-900">Effective Date: May 20, 2024 · Updated November 7, 2026 (text messaging)</p>
          
          <section>
            <h2 className="text-2xl font-bold text-[#311b92] mt-10 mb-4">1. Information We Collect</h2>
            <p>
              Organize SD collects information that you provide directly to us when you sign up for our newsletter, apply for training, or make a contribution. This may include your name, email address, mobile phone number, physical address, zip code, and employer information (as required by election law for political contributions).
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-[#311b92] mt-10 mb-4">2. How We Use Your Information</h2>
            <p>
              We use the information we collect to provide you with updates on our training programs, coordinate volunteer efforts, and comply with state and federal campaign finance laws. We may also use your contact information to invite you to events or to support candidates and initiatives that align with our mission.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-[#311b92] mt-10 mb-4">3. Information Sharing</h2>
            <p>
              We do not sell your personal information to third parties. We may share information with partner organizations and entities that share our goals for political organizing in South Dakota. Information provided during contributions is shared with relevant regulatory bodies as required by law.
            </p>
            <p>
              Mobile phone numbers and text message opt-in consent are never shared, sold, or rented to third parties or affiliates for their marketing purposes. See the Text Messaging Terms below.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-[#311b92] mt-10 mb-4">4. Cookies and Tracking</h2>
            <p>
              Our website uses cookies and similar tracking technologies to analyze site traffic and improve your user experience. You can adjust your browser settings to refuse cookies, though some parts of the site may not function properly as a result.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-[#311b92] mt-10 mb-4">5. Your Rights</h2>
            <p>
              You may opt-out of receiving communications from us at any time by following the "unsubscribe" link in our emails, replying STOP to any text message, or contacting us directly at organize@organizesd.org.
            </p>
          </section>

          <section id="sms-terms" className="scroll-mt-32">
            <h2 className="text-2xl font-bold text-[#311b92] mt-10 mb-4">6. Text Messaging (SMS) Terms</h2>
            <p>
              When you provide your mobile number and check the consent box on our signup form, you agree to receive recurring automated text messages from {SMS_ORGANIZATION}, including contact, donation asks, and informational messages about our training programs and events. Consent is not a condition of signing up or of any purchase or contribution.
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Msg &amp; data rates may apply. Msg frequency varies.</li>
              <li>Reply <strong>STOP</strong> at any time to unsubscribe. You will receive one final message confirming you have been unsubscribed.</li>
              <li>Text <strong>START</strong> to opt back in.</li>
              <li>Reply <strong>HELP</strong> for help, or email organize@organizesd.org.</li>
              <li>Carriers are not liable for delayed or undelivered messages.</li>
            </ul>
            <p>
              We will not share, sell, or rent your mobile number or text message opt-in data and consent with third parties or affiliates for marketing purposes. Information is shared only with the service providers who deliver our messages on our behalf.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-[#311b92] mt-10 mb-4">7. Security</h2>
            <p>
              We take reasonable measures to protect your personal information from unauthorized access, use, or disclosure. However, no internet transmission is ever completely secure.
            </p>
          </section>

          <section className="pt-10 border-t border-gray-200 mt-12">
            <p className="italic text-sm">
              Organize SD is a Section 527 political organization. For questions regarding this policy, please contact us at info@organizesd.org.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};