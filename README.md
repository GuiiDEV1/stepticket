# 🤖 Noozy - Discord Bot Multifuncional & Dashboard Web (`noozy.app`)

Bot de Discord profissional, moderno (Discord.js v14) e completo com **Painel Web Dashboard Oficial (noozy.app)**, **Tickets**, **Gerenciador de FastFlags & Offsets**, **Rastreador de Atualizações do Roblox**, **Verificação Anti-Bot com Captcha Canvas**, **Economia Completa com Loja de Cargos**, **Notificador de YouTube/Twitch/Kick**, **Moderação Completa com Warns**, **Auto-Moderação & Anti-Spam**, **Sorteios (Giveaways)**, **Sugestões**, **Cargos por Botão (Reaction Roles)**, **Níveis & XP em Canvas**, **Enquetes** e **Utilitários**.

---

## 🌐 Painel Web Dashboard
- Acesse via navegador: `https://noozy.app` (ou `http://localhost:3000` em desenvolvimento)
- Login seguro oficial via **Discord OAuth2**.
- Seletor de Servidores Inteligente (Servidores ativos com o bot vs Servidores para adicionar).
- Controle gráfico de Tickets, Verificação, Roblox Tracker, Loja, Criadores e AutoMod.

---

## 🌟 Módulos e Comandos

### ⚡ FastFlags & Otimização (`/flag`)
- `/flag limpar [arquivo] [texto] [modo]`: Limpa e entrega o `ClientAppSettings.json` otimizado.
- `/flag checar [arquivo] [texto]`: Analisa as flags e envia **2 arquivos .json separados** (`flags_validas.json` e `flags_invalidas.json`).
- `/flag offsets`: Consulta os offsets de memória mais recentes diretamente do `offsets.imtheo.lol`.
- `/flag info <nome>`: Consulta o status e valor padrão de uma flag no catálogo oficial da Roblox.

### 🌐 Roblox Tracker & Versões (`/roblox`)
- `/roblox versao`: Versão ativa do Roblox Player e Studio no canal LIVE.
- `/roblox status`: Status do rastreador 24/7 e deploys da Roblox.
- `/roblox testar`: Simula o envio de um alerta de atualização no canal configurado.
- `/setup roblox-tracker <canal> [cargo_ping]`: Alertas automáticos de novas atualizações do jogo.

### 🔐 Verificação Anti-Bot & Captcha Canvas
- `/setup verify <canal> <cargo_membro> [tipo: captcha ou botão]`: Painel interativo com imagem Canvas e modal de resposta.

### 💰 Economia & Minijogos
- `/daily`: Resgate diário de moedas (500 a 1.500 Coins).
- `/work`: Salário por trabalho com cooldown de 1h.
- `/carteira [usuario]`: Saldo na carteira e no banco.
- `/depositar <quantidade|tudo>` e `/sacar <quantidade|tudo>`: Gestão bancária.
- `/pagar <usuario> <quantidade>`: Transferências entre membros.
- `/apostar <quantidade>`: Minijogo de roleta/cassino (Multiplicador 2x e Jackpot 3x).
- `/loja ver` e `/loja comprar <id>`: Compra de cargos configurados no servidor.
- `/setup loja add|remove`: Administração da loja.

### 📢 Notificador de YouTube
- `/setup youtube <canal_discord> <id_canal_youtube> [mensagem]`: Anúncios automáticos de novos vídeos via RSS.

### 🎫 Tickets, Moderação & Comunidade
- Sistema completo de Tickets com transcrições HTML.
- Moderação completa (`/ban`, `/unban`, `/kick`, `/timeout`, `/clear`, `/warn`, `/warnings`, `/delwarn`, `/clearwarns`, `/nuke`, `/lock`).
- AutoMod em tempo real (Anti-Link, Anti-Invite, Anti-Spam, Anti-Mass Mention).
- Sorteios (`/giveaway`), Sugestões (`/sugestao`), Níveis (`/rank` Canvas e `/leaderboard`).

---

Desenvolvido para oferecer máxima estabilidade, segurança e performance! 🚀
