# 🤖 StepTicket Bot - Discord Multifuncional & Luqqzstrap FastFlags

Bot de Discord profissional, moderno (Discord.js v14) e completo com sistema avançado de **Tickets (StepTicket)**, **Gerenciador de FastFlags & Offsets (Luqqzstrap)**, **Moderação Completa com Warns**, **Auto-Moderação & Anti-Spam**, **Sorteios (Giveaways)**, **Sugestões**, **Cargos por Botão (Reaction Roles)**, **Níveis & XP em Canvas**, **Enquetes** e **Utilitários**, desenvolvido especificamente para rodar com baixo consumo de memória (<45MB RAM) e facilidade de deploy em **hospedagens gratuitas**.

---

## 🌟 Recursos Principais

- ⚡ **Módulo FastFlags & Luqqzstrap / Bloxstrap (`/flag`)**:
  - `/flag limpar`: Analisa arquivos `ClientAppSettings.json` ou textos JSON de flags, remove flags perigosas que causam crash ou ban, corrige tipos inválidos (ex: string `"true"` -> `true`, `"240"` -> `240`) e entrega o arquivo limpo e otimizado para download.
  - `/flag offsets`: Consulta os offsets de memória mais recentes diretamente do `https://offsets.imtheo.lol/` (versão do Roblox, total de offsets e data).
  - `/flag info <nome>`: Consulta dados de uma flag específica e verifica se ela está ativa no catálogo oficial do Roblox (mais de 22.000 flags ao vivo).
  - `/flag checar`: Diagnóstico de flags sem modificação de arquivo.
  - **Cooldown de 10 segundos** por usuário integrado.
- 🎫 **Sistema de Tickets Avançado**:
  - Painel interativo com Select Menu de categorias (*Suporte, Denúncias, Compras, Dúvidas*).
  - Canais privados automáticos com permissões configuradas.
  - Reivindicar ticket (*Claim*), adicionar/remover participantes, fechar e reabrir.
  - **Transcrição Completa em HTML** enviada no canal de logs e na DM do criador.
- 🛡️ **Moderação Completa & Punições**:
  - `/ban`, `/unban`, `/kick`, `/timeout`, `/untimeout`, `/clear` (com filtros), `/lock`, `/unlock`, `/slowmode`, `/nuke`, `/role add/remove`.
  - **Sistema de Advertências (`/warn`, `/warnings`, `/delwarn`, `/clearwarns`)** com histórico persistente.
- 🤖 **Auto-Moderação & Proteção em Tempo Real**:
  - Filtro Anti-Invite, Anti-Link, Anti-Flood/Spam e Anti-Mass Mention.
- 🎉 **Sorteios (Giveaways)**:
  - `/giveaway start` com contagem regressiva, botão 🎉 interativo e escolha de múltiplos ganhadores.
  - `/giveaway end` e `/giveaway reroll`.
- 💡 **Sistema de Sugestões**:
  - Envio de sugestões com botões 👍/👎 para votação e aprovação por Modal da Staff.
- 🏷️ **Cargos por Botão (Reaction Roles)**:
  - Painel interativo para membros pegarem/removerem cargos com 1 clique.
- ⭐ **Sistema de Níveis & XP em Canvas**:
  - `/rank` com imagem gerada via Canvas em tempo real e `/leaderboard` (Top 10).
- 📊 **Enquetes Dinâmicas**:
  - `/enquete` com votações por botão e barra gráfica de porcentagem em tempo real.
- 🛠️ **Utilitários & Ferramentas**:
  - `/calc`, `/userinfo`, `/serverinfo`, `/botinfo`, `/avatar`, `/banner`, `/ping` e `/help` interativo.
- 📜 **Logs de Auditoria & Boas-Vindas**.

---

## 📖 Guia de Comandos

### ⚡ FastFlags & Luqqzstrap (`/flag`)
| Comando | Descrição |
| :--- | :--- |
| `/flag limpar [arquivo] [texto] [modo]` | Limpa e corrige o ClientAppSettings.json e entrega o arquivo para download |
| `/flag offsets` | Consulta a versão do Roblox e offsets de memória em offsets.imtheo.lol |
| `/flag info <nome>` | Consulta detalhes e status oficial de uma FastFlag |
| `/flag checar [arquivo] [texto]` | Realiza diagnóstico de flags sem gerar novo arquivo |

---

Desenvolvido para oferecer estabilidade, segurança e performance máxima para o Luqqzstrap e sua comunidade no Discord! 🚀
