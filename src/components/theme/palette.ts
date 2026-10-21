// Mantenha estes valores iguais aos de src/styles.css.

export const sage = {
	50: "#f6faf8",
	100: "#eef4f1",
	200: "#dde7e2",
	300: "#c4d3cc",
	400: "#94a89f",
	500: "#5f7268",
	600: "#4b5c54",
	700: "#37453f",
	800: "#232e29",
	900: "#151d19",
	950: "#0b110e",
} as const;

export const emerald = {
	400: "#34d399",
	500: "#10b981",
	600: "#059669",
	700: "#047857",
	950: "#022c22",
} as const;

export const red = {
	400: "#f87171",
	600: "#dc2626",
} as const;

export const white = "#ffffff";

export type ThemeColors = {
	background: string;
	surface: string;
	foreground: string;
	mutedForeground: string;
	border: string;
	input: string;
	primary: string;
	primaryForeground: string;
	ring: string;
	destructive: string;
};

export const themeColors: Record<"light" | "dark", ThemeColors> = {
	light: {
		background: sage[100],
		surface: white,
		foreground: sage[900],
		mutedForeground: sage[500],
		border: sage[200],
		input: sage[300],
		primary: emerald[700],
		primaryForeground: white,
		ring: emerald[600],
		destructive: red[600],
	},
	dark: {
		background: sage[950],
		surface: sage[900],
		foreground: sage[50],
		mutedForeground: sage[400],
		border: sage[800],
		input: sage[700],
		primary: emerald[500],
		primaryForeground: emerald[950],
		ring: emerald[400],
		destructive: red[400],
	},
};

/** Pares de texto e fundo que precisam de contraste de pelo menos 4,5:1. */
export function textPairs(colors: ThemeColors) {
	return [
		["texto principal / fundo", colors.foreground, colors.background],
		["texto principal / superfície", colors.foreground, colors.surface],
		["texto secundário / fundo", colors.mutedForeground, colors.background],
		["texto secundário / superfície", colors.mutedForeground, colors.surface],
		["ação principal", colors.primaryForeground, colors.primary],
	] as const;
}
