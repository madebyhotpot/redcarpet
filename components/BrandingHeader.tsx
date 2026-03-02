export default function BrandingHeader() {
  return (
    <header className="pt-[39px]">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/confluence-logo.png"
        alt="Confluence Awards"
        className="h-[90px] w-auto object-contain mx-auto"
      />
      {/* Subtitle — centered, directly below logo */}
      <p className="text-white text-[15px] font-medium tracking-widest text-center mt-[5px]">
        AUGMENTED RED CARPET EXPERIENCE
      </p>
    </header>
  );
}
