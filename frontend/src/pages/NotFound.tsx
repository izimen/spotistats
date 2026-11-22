import { Link } from "react-router-dom";

const NotFound = () => (
  <main className="flex min-h-screen flex-col justify-center bg-background px-5 sm:px-10 lg:px-16">
    <h1 className="type-poster text-[clamp(7rem,34vw,26rem)] text-primary" aria-label="Błąd 404">404</h1>
    <p className="mt-6 type-head text-[clamp(1.6rem,4vw,2.4rem)]">Tej strony nie ma.</p>
    <p className="mt-2 max-w-[50ch] text-muted-foreground">Adres mógł się zmienić. Wszystko jest dostępne z menu strony głównej.</p>
    <Link
      to="/"
      className="mt-8 inline-block self-start text-lg font-semibold underline decoration-primary decoration-2 underline-offset-4"
    >
      Przejdź do strony głównej
    </Link>
  </main>
);

export default NotFound;
