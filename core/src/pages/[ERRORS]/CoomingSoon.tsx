export default function ComingSoon() {
  return (
    <div className="h-svh flex items-center justify-center">
      <div className="flex flex-col items-center gap-4 text-center px-4">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="72"
          height="72"
          viewBox="0 0 24 24"
          fill="none"
          stroke="white"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          className="tabler-icon tabler-icon-planet "
        >
          <path d="M18.816 13.58c2.292 2.138 3.546 4 3.092 4.9c-.745 1.46 -5.783 -.259 -11.255 -3.838c-5.47 -3.579 -9.304 -7.664 -8.56 -9.123c.464 -.91 2.926 -.444 5.803 .805"></path>
          <path d="M12 12m-7 0a7 7 0 1 0 14 0a7 7 0 1 0 -14 0"></path>
        </svg>
        <h1 className="text-4xl font-bold text-white">Coming Soon 👀</h1>
        <p className="text-muted-foreground">
          This page hasn't been created yet. <br />
          Stay tuned though!
        </p>
      </div>
    </div>
  );
}
