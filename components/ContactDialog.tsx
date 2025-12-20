
import React, { useState } from 'react';

interface ContactDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ContactDialog: React.FC<ContactDialogProps> = ({ isOpen, onClose }) => {
  const [formData, setFormData] = useState({ name: '', email: '', message: '' });

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Contact form:', formData);
    alert('Message sent! Our team will reach out shortly.');
    setFormData({ name: '', email: '', message: '' });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#311b92]/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden relative border-4 border-teal-400">
        <button 
          onClick={onClose}
          className="absolute top-6 right-6 text-[#311b92] hover:text-rose-500 transition-colors text-2xl"
        >
          <i className="fas fa-times"></i>
        </button>

        <div className="p-8 md:p-12">
          <h2 className="text-3xl md:text-4xl font-black text-[#311b92] mb-2 uppercase italic tracking-tighter">Contact Our Team</h2>
          <p className="text-gray-600 font-medium mb-8">Have a specific question about OSD? Let's connect.</p>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-widest text-[#311b92]">Full Name</label>
                <input 
                  required
                  type="text" 
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full p-4 border-2 border-gray-100 rounded-xl focus:border-teal-400 focus:outline-none transition-colors" 
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-widest text-[#311b92]">Email Address</label>
                <input 
                  required
                  type="email" 
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  className="w-full p-4 border-2 border-gray-100 rounded-xl focus:border-teal-400 focus:outline-none transition-colors" 
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-widest text-[#311b92]">Message</label>
              <textarea 
                required
                rows={4}
                value={formData.message}
                onChange={(e) => setFormData({...formData, message: e.target.value})}
                className="w-full p-4 border-2 border-gray-100 rounded-xl focus:border-teal-400 focus:outline-none transition-colors"
              ></textarea>
            </div>
            <button 
              type="submit"
              className="w-full bg-[#311b92] hover:bg-teal-600 text-white font-black uppercase py-5 rounded-xl text-lg transition-all shadow-xl active:scale-95"
            >
              Send Message
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
