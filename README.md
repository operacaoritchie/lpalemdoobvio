# Além do Óbvio — site v2 (experiência de rolagem)

Página estática da Imersão Além do Óbvio com o Dr. Ritchie (4, 5 e 6 de dezembro de 2026, São Paulo).
Mesmos textos, links e logo do site em produção (`main`), com nova direção de arte.

## Estrutura
- `index.html` — página completa (HTML, CSS e o script próprio da página: créditos de abertura, lente "O olhar do Doutor", autoavaliação e formulário → WhatsApp)
- `sites-incriveis.css` / `sites-incriveis.js` — motor de animações de rolagem (não editar)
- `img/` — imagens otimizadas em WebP e a logo

## Rodar local
Qualquer servidor estático na raiz, por exemplo:
```
npx serve .
```

## Deploy
`vercel.json` está configurado para site estático (sem build). Um preview desta branch na Vercel serve a página na raiz.
