# Relish Idle Prototype

## Deployment
- Deployed to ktn at `relish.kautiontape.com`
- Self-hosted GitHub Actions runner: `runs-on: [self-hosted, ktn]`
- Push to main triggers automatic deploy
- Container: port 8104 → nginx reverse proxy

## Prototype Subdomain Pattern
`relish.kautiontape.com` hosts multiple game prototypes under subpaths:
- `/` — this prototype (relish-idle-prototype, port 8104)
- `/concept-name/` — future prototypes get their own path

To add a new prototype:
1. Create a new repo under Kautiontape org
2. Set `base: '/concept-name/'` in `vite.config.ts`
3. Add docker-compose with next port (8105, 8106, etc.)
4. Add `location /concept-name/ { proxy_pass http://127.0.0.1:PORT/; }` to nginx config on ktn
5. Push — deploy runs automatically

## Tech
- Svelte/Vite + TypeScript + HTML Canvas
- Docker: nginx serving static build
- Game config: `src/game/Config.ts`
