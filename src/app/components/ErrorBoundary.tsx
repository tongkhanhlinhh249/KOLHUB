export function ErrorBoundary() {
  return (
    <div className="flex items-center justify-center h-screen bg-muted/50">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-foreground mb-2">Oops! Something went wrong</h1>
        <p className="text-muted-foreground mb-4">Please try refreshing the page</p>
        <a href="/" className="text-primary hover:underline">Go back to home</a>
      </div>
    </div>
  );
}
