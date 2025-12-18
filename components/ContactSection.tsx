
import React, { useState } from 'react';

export const ContactSection: React.FC = () => {
  const [formData, setFormData] = useState({ name: '', email: '', message: '' });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Contact form:', formData);
    alert('Message sent! We will get back to you shortly.');
    setFormData({ name: '', email: '', message: '' });
  };

  return (
    <section id="contact" className="py-24 bg-white scroll-mt-20">
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-black text-[#311b92] mb-4 uppercase tracking-tighter italic">Contact Organize SD</h2>
          <div className="w-24 h-2 bg-rose-500 mx-auto"></div>
          <p className="mt-6 text-gray-600 text-lg font-medium">Have questions about our training or want to partner with us? Drop us a line.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 bg-gray-50 p-8 md:p-12 rounded-2xl border border-gray-100 shadow-sm">
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-widest text-[#311b92]">Full Name</label>
              <input 
                required
                type="text" 
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                placeholder="Jane Doe"
                className="w-full p-4 border-2 border-gray-200 rounded-lg focus:border-teal-400 focus:outline-none transition-colors" 
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-widest text-[#311b92]">Email Address</label>
              <input 
                required
                type="email" 
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                placeholder="jane@example.com"
                className="w-full p-4 border-2 border-gray-200 rounded-lg focus:border-teal-400 focus:outline-none transition-colors" 
              />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-black uppercase tracking-widest text-[#311b92]">How can we help?</label>
            <textarea 
              required
              rows={5}
              value={formData.message}
              onChange={(e) => setFormData({...formData, message: e.target.value})}
              placeholder="Tell us about your campaign or training needs..."
              className="w-full p-4 border-2 border-gray-200 rounded-lg focus:border-teal-400 focus:outline-none transition-colors"
            ></textarea>
          </div>
          <button 
            type="submit"
            className="w-full bg-[#311b92] hover:bg-teal-600 text-white font-black uppercase py-5 rounded-lg text-lg transition-all shadow-xl active:scale-95"
          >
            Send Message
          </button>
        </form>
      </div>
    </section>
  );
};
