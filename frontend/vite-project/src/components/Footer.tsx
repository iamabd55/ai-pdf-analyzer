const Footer = () => {
  return (
    <footer className="mt-auto border-t border-[#f0f1f5] dark:border-[#3a3f4a] bg-white dark:bg-background-dark py-12">
      <div className="max-w-300 mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="flex items-center gap-2 grayscale opacity-60">
          <span className="material-symbols-outlined text-2xl ">description</span>
          <h2 className="text-lg font-bold">DeepRead</h2>
        </div>
        <div className="flex gap-12 text-[#5e6e8d] dark:text-gray-400 font-medium">
          <a className="hover:text-primary transition-colors" href="#">
            Documentation
          </a>
          <a className="hover:text-primary transition-colors" href="#">
            Github
          </a>
          <a className="hover:text-primary transition-colors" href="#">
            Privacy
          </a>
        </div>
        <div className="text-[#5e6e8d] dark:text-gray-400 text-sm font-medium">
          Made with <span className="text-primary font-bold">LangChain</span> &amp; React
        </div>
      </div>
    </footer>
  );
};

export default Footer;