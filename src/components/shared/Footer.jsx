export default function Footer() {
  return (
    <div className="flex flex-col items-center gap-2 px-6 py-4 bg-background/50">
      <div className="flex items-center gap-4 opacity-60">
        <img
          src="https://media.base44.com/images/public/69cd578540390a850769aa6d/570bdc5f1_cropped-coldiretti-vector-logo.png"
          alt="Coldiretti"
          className="h-5 w-auto"
        />
        <img
          src="https://media.base44.com/images/public/69cd578540390a850769aa6d/ce1586586_images.jpeg"
          alt="Campagna Amica"
          className="h-5 w-auto rounded"
        />
      </div>
      <p className="text-muted-foreground text-[10px]">© Coldiretti · Campagna Amica</p>
    </div>
  );
}