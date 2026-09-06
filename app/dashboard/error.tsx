"use client"
export default function ErrorPage({reset}: {reset: () => void}) { return <main className="p-8"><h1 className="text-xl font-bold">Workspace could not be loaded</h1><p className="my-4">Please check your connection and try again.</p><button onClick={reset} className="underline">Retry</button></main> }

