PAINEL DE ATENDIMENTOS

Projeto para análise dos relatórios de atendimento da tela T9095A.

ARQUIVOS PRINCIPAIS
- index.html: painel de consulta.
- painel.js: filtros, indicadores e análises.
- horarios.js: agendas regulares, agendas extras e horários de almoço.
- converter.html / converter.js: conversão da planilha para JSON.
- dados/atendimentos.json: base pública exibida pelo site.
- dados/Analise_Atendimentos_Julho_2026.xlsx: planilha mensal disponível para download.

FILTROS
- Data inicial.
- Data final.
- Especialidade.
- Médico.

Ao selecionar uma especialidade, o campo Médico exibe somente os profissionais
que possuem registros naquela especialidade.

ANÁLISE DE HORÁRIOS
A análise compara:
- primeiro atendimento com o início previsto, usando tolerância de 15 minutos;
- último término com o fim previsto;
- quantidade de esperas superiores a 1h30.

Quando um médico atende duas especialidades no mesmo dia, a análise diária reúne
os blocos de agenda daquele dia.

DRA. FERNANDA
- 10/07/2026:
  Ginecologia Clínica, 08:00 às 16:00.
  Obstetrícia / Pré-Natal, 16:00 às 18:00.
  Período diário analisado: 08:00 às 18:00.
- 16/07/2026:
  Obstetrícia / Pré-Natal, 08:00 às 12:00.
  Ginecologia Clínica, 12:00 às 16:00.
  Período diário analisado: 08:00 às 16:00.

ATUALIZAÇÃO DOS DADOS
Para que todos os dispositivos vejam a mesma informação:
1. Atualize a planilha mensal.
2. Gere o arquivo dados/atendimentos.json.
3. Substitua os dois arquivos no GitHub.
4. Aguarde a nova publicação do Vercel.

PRIVACIDADE
Os dados exibidos são anonimizados para preservar a privacidade dos pacientes,
conforme a LGPD.
