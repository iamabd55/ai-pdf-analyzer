import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser, SignedIn, SignedOut, SignInButton } from '@clerk/clerk-react';
import UploadModal from '../components/UploadModal';
import Header from '../components/Header';
import Footer from '../components/Footer';
import supabase from '../utils/supabase';

const Home = () => {
  const navigate = useNavigate();
  const { user } = useUser();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [uploadMode, setUploadMode] = useState<'summarize' | 'chat'>('summarize');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);

  // Open modal with mode
  const handleOpenModal = (mode: 'summarize' | 'chat') => {
    setUploadMode(mode);
    setIsModalOpen(true);
  };

  // ✅ OPTIMIZED: Upload to Supabase + Backend in parallel
// ✅ OPTIMIZED: Upload to Supabase + Navigate Immediately
const handleUpload = async (file: File) => {
  const API_URL = 'http://localhost:8000';
  if (!user) {
    alert("Please sign in to upload PDFs");
    return;
  }

  setIsUploading(true);
  setUploadProgress(10);

  try {
    // 1️⃣ Upload to Supabase Storage
    console.log('📤 Uploading to Supabase storage...');
    const fileName = `${Date.now()}_${file.name}`;
    const filePath = `${user.id}/${fileName}`;

    setUploadProgress(30);

    const { error: uploadError } = await supabase.storage
      .from('pdfs')
      .upload(filePath, file);

    if (uploadError) {
      console.error('❌ Supabase upload error:', uploadError);
      throw new Error(`Storage upload failed: ${uploadError.message}`);
    }

    console.log('✅ Uploaded to Supabase storage');
    setUploadProgress(60);

    // 2️⃣ Create database record
    console.log('💾 Creating database record...');
    const { data: fileRecord, error: fileError } = await supabase
      .from('files')
      .insert([{
        user_id: user.id,
        file_name: file.name,
        storage_path: filePath,
        file_size: file.size
      }])
      .select()
      .single();

    if (fileError) {
      console.error('❌ Database insert error:', fileError);
      throw new Error(`Database insert failed: ${fileError.message}`);
    }

    console.log('✅ Database record created:', fileRecord.id);
    setUploadProgress(100);

    // 3️⃣ Send to backend for background processing (DON'T WAIT)
    console.log('🤖 Triggering backend processing...');
    const formData = new FormData();
    formData.append('file', file);
    formData.append('file_id', fileRecord.id);

    // Fire and forget - let it process in background
    fetch(`${API_URL}/upload-pdf`, {
      method: 'POST',
      body: formData,
    }).catch(err => console.error('Backend processing error:', err));

    // 4️⃣ Navigate IMMEDIATELY to chat page
    setIsModalOpen(false);
    navigate(uploadMode === 'summarize' ? '/summarize' : '/chat', {
      state: { file: fileRecord }
    });

  } catch (err: any) {
    console.error('❌ Upload failed:', err);
    alert(`Upload failed: ${err.message}`);
  } finally {
    setIsUploading(false);
    setUploadProgress(0);
  }
};


  return (
    <>
      <Header />
      <section className="px-6 py-16 md:py-14 max-w-300 mx-auto text-center">
        {/* Powered by Gemini */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-wider mb-6">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
          </span>
          Powered by Gemini
        </div>

        {/* Hero */}
        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-8 leading-[1.1] display-font">
          Understand any PDF <br className="hidden md:block" />
          <span className="text-primary">in seconds.</span>
        </h1>

        <p className="text-lg md:text-xl text-[#5e6e8d] dark:text-gray-400 max-w-175 mx-auto mb-12 font-medium">
          Upload your documents and let DeepRead's AI extract insights, summarize complex topics, and answer your questions instantly.
        </p>

        {/* Action Cards */}
        <div className="flex flex-col md:flex-row justify-center items-stretch gap-11 mb-20 max-w-4xl mx-auto">

          {/* Summarize Card */}
          <div className="group relative flex-1 bg-white dark:bg-background-dark border border-[#f0f1f5] dark:border-[#3a3f4a] p-8 rounded-xl shadow-sm hover:shadow-xl hover:border-primary/30 transition-all cursor-pointer">
            <div className="w-14 h-14 bg-primary/10 rounded-lg flex items-center justify-center text-primary mb-6 group-hover:bg-primary group-hover:text-white transition-colors mx-auto">
              <span className="material-symbols-outlined text-3xl">article</span>
            </div>
            <h3 className="text-xl font-bold mb-3">Summarize Document</h3>
            <p className="text-sm text-[#5e6e8d] dark:text-gray-400 mb-6">
              Condense long research papers and reports into concise key takeaways.
            </p>

            {/* Logged-in / Logged-out buttons */}
            <SignedIn>
              <button
                onClick={() => handleOpenModal('summarize')}
                disabled={isUploading}
                className="w-full py-3 bg-primary text-white font-bold rounded-lg hover:bg-primary/90 transition-all transform group-hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isUploading ? 'Uploading...' : 'Start Summarizing'}
              </button>
            </SignedIn>

            <SignedOut>
              <SignInButton>
                <button className="w-full py-3 bg-primary/80 text-white font-bold rounded-lg hover:bg-primary transition-all">
                  Sign in to Summarize
                </button>
              </SignInButton>
            </SignedOut>
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

            <SignedIn>
              <button
                onClick={() => handleOpenModal('chat')}
                disabled={isUploading}
                className="w-full py-3 bg-white dark:bg-[#3a3f4a] border-2 border-primary text-primary dark:text-white font-bold rounded-lg hover:bg-primary/5 transition-all transform group-hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isUploading ? 'Uploading...' : 'Open Chat'}
              </button>
            </SignedIn>

            <SignedOut>
              <SignInButton>
                <button className="w-full py-3 bg-primary/80 text-white font-bold rounded-lg hover:bg-primary transition-all">
                  Sign in to Chat
                </button>
              </SignInButton>
            </SignedOut>
          </div>
        </div>

        {/* Upload Progress */}
        {isUploading && (
          <div className="max-w-md mx-auto mb-8">
            <div className="bg-gray-200 rounded-full h-2 overflow-hidden">
              <div 
                className="bg-primary h-full transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
            <p className="text-sm text-gray-600 mt-2">Uploading... {uploadProgress}%</p>
          </div>
        )}

        {/* Why DeepRead Section */}
        <div className="max-w-4xl mx-auto mt-16">
          <div className="text-center mb-8">
            <h2 className="text-3xl md:text-4xl font-bold mb-3">Why DeepRead?</h2>
            <p className="text-[#5e6e8d] dark:text-gray-400">More than just another AI chat interface</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {/* Feature 1 */}
            <div className="flex-col justify-center items-center flex bg-linear-to-br from-primary/5 to-primary/10 dark:from-primary/10 dark:to-primary/5 p-6 rounded-xl border border-primary/20">
              <div className="w-12 h-12 bg-primary text-white rounded-lg flex items-center justify-center mb-4">
                <span className="material-symbols-outlined text-2xl">description</span>
              </div>
              <h3 className="text-lg font-bold mb-2">Document-Aware Context</h3>
              <p className="text-sm text-[#5e6e8d] dark:text-gray-400">
                Unlike generic LLMs, DeepRead understands your entire PDF's structure, maintaining context across pages and sections.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="flex-col justify-center items-center flex bg-linear-to-br from-green-500/5 to-green-500/10 dark:from-green-500/10 dark:to-green-500/5 p-6 rounded-xl border border-green-500/20">
              <div className="w-12 h-12 bg-green-500 text-white rounded-lg flex items-center justify-center mb-4">
                <span className="material-symbols-outlined text-2xl">fact_check</span>
              </div>
              <h3 className="text-lg font-bold mb-2">Accurate Source Citations</h3>
              <p className="text-sm text-[#5e6e8d] dark:text-gray-400">
                Every answer includes precise page references and quotes, eliminating hallucinations and ensuring verifiable responses.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="flex-col justify-center items-center flex bg-linear-to-br from-purple-500/5 to-purple-500/10 dark:from-purple-500/10 dark:to-purple-500/5 p-6 rounded-xl border border-purple-500/20">
              <div className="w-12 h-12 bg-purple-500 text-white rounded-lg flex items-center justify-center mb-4">
                <span className="material-symbols-outlined text-2xl">auto_awesome</span>
              </div>
              <h3 className="text-lg font-bold mb-2">Smart Summarization</h3>
              <p className="text-sm text-[#5e6e8d] dark:text-gray-400">
                Specialized algorithms extract key insights, methodology, and conclusions—perfect for research papers and reports.
              </p>
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