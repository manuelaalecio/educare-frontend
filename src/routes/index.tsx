import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
	return (
		<main className="p-8">
			<h1 className="text-4xl font-bold text-foreground">Educare</h1>
			<p className="mt-4 text-lg text-muted-foreground">
				Sistema de gestão escolar.
			</p>
		</main>
	);
}
