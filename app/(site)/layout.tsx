import "lenis/dist/lenis.css";

import { Suspense } from "react";

import { SmoothScroll } from "@/components/motion/smooth-scroll";
import { BookBar } from "@/components/site/book-bar";
import { Footer } from "@/components/site/footer";
import { Header } from "@/components/site/header";

export default function SiteLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex flex-1 flex-col bg-page pb-20 text-ink md:pb-0">
      <SmoothScroll />
      <Header />
      {children}
      <Footer />
      <Suspense>
        <BookBar />
      </Suspense>
    </div>
  );
}
