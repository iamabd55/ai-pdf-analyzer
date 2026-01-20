import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import UploadModal from '../components/UploadModal';
import Header from '../components/Header';
import Footer from '../components/Footer';
const Home = () => {
  const navigate = useNavigate();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [uploadMode, setUploadMode] = useState<'summarize' | 'chat'>('summarize');

  const handleOpenModal = (mode: 'summarize' | 'chat') => {
    setUploadMode(mode);
    setIsModalOpen(true);
  };

  const handleUpload = (file: File) => {
    // Close modal and navigate to the appropriate page
    setIsModalOpen(false);
    if (uploadMode === 'summarize') {
      navigate('/summarize', { state: { file } });
    } else {
      navigate('/chat', { state: { file } });
    }
  };

  return (
    <>
    <Header/>
      <section className="px-6 py-16 md:py-14 max-w-300 mx-auto text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-wider mb-6">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
          </span>
          Powered by GPT-4o
        </div>

        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-8 leading-[1.1] display-font">
          Understand any PDF <br className="hidden md:block" />
          <span className="text-primary">in seconds</span>
        </h1>

        <p className="text-lg md:text-xl text-[#5e6e8d] dark:text-gray-400 max-w-175 mx-auto mb-12 font-medium">
          Upload your documents and let DeepRead's AI extract insights, summarize complex topics, and answer your questions instantly.
        </p>

        {/* Action Cards */}
        <div className="flex flex-col md:flex-row justify-center items-stretch gap-6 mb-20 max-w-4xl mx-auto">
          {/* Summarize Card */}
          <div className="group relative flex-1 bg-white dark:bg-background-dark border border-[#f0f1f5] dark:border-[#3a3f4a] p-8 rounded-xl shadow-sm hover:shadow-xl hover:border-primary/30 transition-all cursor-pointer">
            <div className="w-14 h-14 bg-primary/10 rounded-lg flex items-center justify-center text-primary mb-6 group-hover:bg-primary group-hover:text-white transition-colors mx-auto">
              <span className="material-symbols-outlined text-3xl">article</span>
            </div>
            <h3 className="text-xl font-bold mb-3">Summarize Document</h3>
            <p className="text-sm text-[#5e6e8d] dark:text-gray-400 mb-6">
              Condense long research papers and reports into concise key takeaways.
            </p>
            <button 
              onClick={() => handleOpenModal('summarize')}
              className="w-full py-3 bg-primary text-white font-bold rounded-lg hover:bg-primary/90 transition-all transform group-hover:scale-[1.02]"
            >
              Start Summarizing
            </button>
          </div>

          {/* Chat Card */}
          <div className="group relative flex-1 bg-white dark:bg-background-dark border border-[#f0f1f5] dark:border-[#3a3f4a] p-8 rounded-xl shadow-sm hover:shadow-xl hover:border-primary/30 transition-all cursor-pointer">
            <div className="w-14 h-14 bg-primary/10 rounded-lg flex items-center justify-center text-primary mb-6 group-hover:bg-primary group-hover:text-white transition-colors mx-auto">
              <span className="material-symbols-outlined text-3xl">chat_bubble</span>
            </div>
            <h3 className="text-xl font-bold mb-3">Chat with PDF</h3>
            <p className="text-sm text-[#5e6e8d] dark:text-gray-400 mb-6">
              Ask specific questions and get instant answers sourced directly from your file.
            </p>
            <button 
              onClick={() => handleOpenModal('chat')}
              className="w-full py-3 bg-white dark:bg-[#3a3f4a] border-2 border-primary text-primary dark:text-white font-bold rounded-lg hover:bg-primary/5 transition-all transform group-hover:scale-[1.02]"
            >
              Open Chat
            </button>
          </div>
        </div>

        {/* Abstract Visual */}
        <div className="relative max-w-3xl mx-auto mt-10">
          <div className="absolute inset-0 bg-primary/20 blur-[120px] rounded-full -z-10 opacity-30"></div>
          <div className="relative bg-white dark:bg-[#2d303a] p-4 rounded-2xl shadow-2xl border border-white/50 overflow-hidden">
            <div className="aspect-video bg-[#f8f9fc] dark:bg-[#1a1c22] rounded-xl flex items-center justify-center relative overflow-hidden">
              {/* Abstract PDF Representation */}
              <div className="w-48 h-64 bg-white dark:bg-[#21242c] rounded-lg shadow-lg flex flex-col p-4 gap-3 relative overflow-hidden border border-gray-100 dark:border-gray-800">
                <div className="w-full h-4 bg-gray-100 dark:bg-gray-700 rounded"></div>
                <div className="w-3/4 h-3 bg-gray-100 dark:bg-gray-700 rounded"></div>
                <div className="w-full h-3 bg-gray-100 dark:bg-gray-700 rounded"></div>
                <div className="w-5/6 h-3 bg-gray-100 dark:bg-gray-700 rounded"></div>
                <div className="mt-4 flex gap-2">
                  <div className="w-12 h-12 bg-primary/10 rounded"></div>
                  <div className="flex-1 space-y-2">
                    <div className="w-full h-2 bg-gray-100 dark:bg-gray-700 rounded"></div>
                    <div className="w-full h-2 bg-gray-100 dark:bg-gray-700 rounded"></div>
                  </div>
                </div>
                {/* Scanning Light Beam */}
                <div className="absolute inset-0 bg-linear-to-b from-transparent via-primary/10 to-transparent animate-pulse"></div>
                <div className="absolute h-0.5 bg-linear-to-r from-transparent via-primary to-transparent w-full top-1/2 shadow-[0_0_15px_#337aff]"></div>
              </div>
              {/* Floating Analysis Badges */}
              <div className="absolute top-10 right-20 bg-primary text-white text-[10px] font-bold px-3 py-1 rounded-full shadow-lg">
                Extracting Insights...
              </div>
              <div className="absolute bottom-12 left-16 bg-green-500 text-white text-[10px] font-bold px-3 py-1 rounded-full shadow-lg">
                Summary Ready
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Upload Modal */}
      <UploadModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onUpload={handleUpload}
      />
    <Footer />
    </>
  );
};

export default Home;