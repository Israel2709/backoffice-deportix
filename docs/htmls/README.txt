DEPORTIX API – BACK OFFICE CONSOLIDADO V3
Alcance visual: Datos Maestros + Operación Deportiva para Fútbol, Football Americano, Fórmula 1 y Tenis.
Abrir 01-inicio.html.

Principios incorporados:
1. Interfaz clara, predominantemente blanca, con identidad DeportiX API.
2. Datos Maestros = información estructural/reutilizable que no se repite por temporada.
3. Operación Deportiva = temporadas/ediciones, participantes, estructura, eventos, resultados y publicación.
4. Las vistas operativas priorizan Vigente / Próxima / Pendiente; finalizadas quedan en histórico.
5. Captura consolidada en tabla y navegación por teclado siempre que existan muchos registros homogéneos.
6. El usuario no copia IDs/UUIDs entre módulos; el Back Office hereda contexto y relaciones.
7. Fútbol: partidos consolidados con orden visual Logo Local | Local | ML | MV | Visitante | Logo Visitante.
8. NFL: Temporada Regular por Semana + Playoffs por Ronda; captura consolidada.
9. F1: Circuitos/Equipos/Pilotos como maestros; Piloto↔Equipo por temporada; calendario/GP/sesiones/resultados/clasificaciones consolidados.
10. Tenis: Jugadores como maestros; edición activa con General | Participantes | Draw | Partidos; resultados por sets y propagación de ganadores.
11. Los HTML son referencia obligatoria de jerarquía, navegación y estilo para desarrollo.

Nota de logos:
- Logo DeportiX API incluido localmente.
- Algunos ejemplos de equipos/competencias usan abreviaturas/placeholder en este prototipo.
- Para entrega técnica final deben sustituirse por logos oficiales locales cuando aplique.


V4 - CLASIFICACIONES
- Fútbol: se agrega 18-clasificacion.html con Posición, Equipo, PJ, GF, GC, DG y Puntos. DG es derivada.
- NFL: se agrega 25-nfl-clasificacion.html con Posición, Equipo, PJ, Ganados, Empatados, Perdidos y Porcentaje. Porcentaje es derivado.
- F1: la clasificación ya estaba contemplada en 39-f1-clasificaciones.html; sin cambios de alcance.
- Tenis: no requiere tabla de clasificación.
- Se eliminan dependencias externas de imágenes en los HTML. Los badges AME/JUA/PAC/LIGA MX incluidos son recursos visuales locales de referencia, no sustituyen los logos oficiales que el desarrollo final deberá usar.
