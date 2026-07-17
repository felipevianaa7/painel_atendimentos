# Painel de Atendimentos

Projeto para análise dos relatórios de atendimento da tela T9095A.

## Regras principais

- Tempo de espera: início do atendimento menos geração da senha.
- Tempo em atendimento: fim menos início.
- Havendo sobreposição, o tempo em atendimento termina no início do paciente seguinte.
- Registros sem horário de término permanecem sem tempo em atendimento.

## Dados públicos

O site usa:
- `dados/atendimentos.json`
- `dados/Analise_Atendimentos_Julho_2026.xlsx`

## Filtros

Data inicial, data final, especialidade e médico. A escolha da especialidade limita a lista de médicos.

## Privacidade

Os dados exibidos são anonimizados para preservar a privacidade dos pacientes, conforme a LGPD.


## Fonte carregada ao abrir o site

O painel carrega sempre a base pública `dados/atendimentos.json` ao abrir a página. Isso evita que uma versão antiga do `localStorage` esconda campos novos, como geração da senha e tempo de espera.

## Tabela de atendimentos

Em telas de computador, a tabela principal usa layout compacto e quebra de texto para caber na largura da página sem rolagem lateral. Em telas menores, a rolagem horizontal continua disponível para preservar a leitura.


## Layout da análise de horários

Em telas de computador, a tabela da análise de horários usa colunas compactas,
quebra de linha e largura fixa para caber integralmente na página, sem rolagem
horizontal. Em telas menores, a rolagem horizontal é mantida para preservar a
legibilidade.


## Prioridade da fonte de dados

Ao abrir o painel:

1. se houver dados convertidos e salvos neste navegador, eles são utilizados;
2. caso contrário, o painel carrega `dados/atendimentos.json`.

O botão **Apagar dados salvos** remove a importação local e volta para a base pública.


## Conversão do tempo de espera

A coluna `Espera (min)` já contém minutos inteiros e é lida diretamente.
Colunas de duração como `Tempo de espera` continuam sendo convertidas a partir
do formato de duração do Excel.

## Geração e confirmação da senha

O conversor lê as colunas `Geração da senha` e `Confirmação da senha` da Base Consolidada e grava os campos `geracaoSenha` e `confirmacaoSenha` no JSON.
