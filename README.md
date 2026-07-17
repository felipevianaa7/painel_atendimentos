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
