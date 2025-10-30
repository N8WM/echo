import pino from "pino";

const appLogStream = pino.destination({ dest: "./app.log", sync: false });
const debugLogStream = pino.destination({ dest: "./debug.log", sync: false });

const prettyStream = pino.transport({
  target: "pino-pretty",
  options: {
    colorize: true,
    translateTime: "SYS:yyyy-mm-dd HH:MM:ss",
    ignore: "pid,hostname"
  }
});

export const Logger = pino(
  { level: "debug" },
  pino.multistream([
    { level: "info", stream: appLogStream },
    { level: "debug", stream: debugLogStream },
    { level: "debug", stream: prettyStream }
  ])
);

export function ind(amount: number, bullet: string | null = null, depth = 3) {
  if (amount === 0) return "";

  const hw = Math.floor((depth + 1.0) / 2.0);
  const sp = " ".repeat(depth * amount);

  return (
    sp.substring(0, sp.length - hw)
    + (bullet ?? " ")
    + sp.substring(sp.length - hw + 1)
  );
}
