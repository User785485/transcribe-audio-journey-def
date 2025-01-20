const FileConverter = () => {
  return (
    <div className="h-full w-full">
      <h1 className="text-2xl font-bold mb-4">Convertisseur de Fichiers</h1>
      <div className="w-full h-[800px]">
        <iframe 
          src="https://www.freeconvert.com/"
          className="w-full h-full border-0"
          title="FreeConvert"
        />
      </div>
    </div>
  );
};

export default FileConverter;