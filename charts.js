(function () {
  'use strict';

  var chartColors = {
    primary: 'rgba(13, 166, 255, 0.9)',
    primaryLight: 'rgba(13, 166, 255, 0.6)',
    cyan: 'rgba(116, 205, 255, 0.9)',
    purple: 'rgba(181, 138, 255, 0.9)',
    darkBlue: 'rgba(14, 30, 63, 0.95)',
    white: 'rgba(255, 255, 255, 0.95)',
    grid: 'rgba(255, 255, 255, 0.1)',
    text: 'rgba(255, 255, 255, 0.9)',
    textMuted: 'rgba(255, 255, 255, 0.6)',
    darkText: '#011235',
    darkGrid: 'rgba(1, 18, 53, 0.15)',
    red: 'rgba(220, 53, 69, 0.9)',
    green: 'rgba(40, 167, 69, 0.9)',
    black: 'rgba(0, 0, 0, 0.85)',
  };

  var lightChartOptions = {
    responsive: true,
    maintainAspectRatio: true,
    plugins: {
      legend: { display: true },
      tooltip: { enabled: true },
    },
    scales: {
      x: {
        grid: { color: chartColors.darkGrid },
        ticks: { color: chartColors.darkText, font: { size: 12 } },
      },
      y: {
        grid: { color: chartColors.darkGrid },
        ticks: { color: chartColors.darkText, font: { size: 12 } },
      },
    },
  };

  var darkChartOptions = {
    responsive: true,
    maintainAspectRatio: true,
    plugins: {
      legend: {
        display: true,
        labels: { color: chartColors.text },
      },
      tooltip: { enabled: true },
    },
    scales: {
      x: {
        grid: { color: chartColors.grid },
        ticks: { color: chartColors.textMuted, font: { size: 12 } },
      },
      y: {
        grid: { color: chartColors.grid },
        ticks: { color: chartColors.textMuted, font: { size: 12 } },
      },
    },
  };

  function formatBRL(value) {
    if (value >= 1e6) return 'R$ ' + (value / 1e6).toFixed(1) + ' mi';
    if (value >= 1e3) return 'R$ ' + (value / 1e3).toFixed(0) + ' mil';
    return 'R$ ' + value.toLocaleString('pt-BR');
  }

  function initPortfolioBars() {
    var ctx = document.getElementById('chart-portfolio-bars');
    if (!ctx) return;
    new Chart(ctx, {
      type: 'bar',
      data: {
        labels: ['Renda Fixa', 'Tesouro', 'Fundos Listados'],
        datasets: [{
          label: 'Valor (R$)',
          data: [218144, 23031, 7962],
          backgroundColor: [chartColors.primary, chartColors.cyan, chartColors.primaryLight],
          borderColor: [chartColors.white, chartColors.white, chartColors.white],
          borderWidth: 1,
        }],
      },
      options: Object.assign({}, darkChartOptions, {
        indexAxis: 'y',
        scales: Object.assign({}, darkChartOptions.scales, {
          x: Object.assign({}, darkChartOptions.scales.x, {
            ticks: Object.assign({}, darkChartOptions.scales.x.ticks, {
              callback: function (v) { return formatBRL(v); },
            }),
          }),
          y: darkChartOptions.scales.y,
        }),
        plugins: Object.assign({}, darkChartOptions.plugins, {
          tooltip: {
            callbacks: {
              label: function (c) { return formatBRL(c.raw); },
            },
          },
        }),
      }),
    });
  }

  var donutDatalabelsPlugin = {
    id: 'donutPercentLabels',
    afterDraw: function (chart) {
      if (chart.config.type !== 'doughnut' || !chart.data.datasets.length) return;
      var ctx = chart.ctx;
      var meta = chart.getDatasetMeta(0);
      var total = chart.data.datasets[0].data.reduce(function (a, b) { return a + b; }, 0);
      meta.data.forEach(function (arc, i) {
        var value = chart.data.datasets[0].data[i];
        var pct = total ? ((value / total) * 100).toFixed(1) : '0';
        var angle = (arc.startAngle + arc.endAngle) / 2;
        var r = (arc.outerRadius + arc.innerRadius) / 2;
        var x = chart.getDatasetMeta(0).data[0].x + Math.cos(angle) * r;
        var y = chart.getDatasetMeta(0).data[0].y + Math.sin(angle) * r;
        ctx.save();
        ctx.fillStyle = chartColors.white;
        ctx.font = 'bold 14px "Inter Tight", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(pct + '%', x, y);
        ctx.restore();
      });
    },
  };

  function initPortfolioDonut() {
    var ctx = document.getElementById('chart-portfolio-donut');
    if (!ctx) return;
    new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['Renda Fixa', 'Tesouro', 'Fundos Listados'],
        datasets: [{
          data: [87.55, 9.24, 3.19],
          backgroundColor: [chartColors.primary, chartColors.cyan, chartColors.primaryLight],
          borderColor: '#0e1e3f',
          borderWidth: 2,
          hoverOffset: 8,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        cutout: '60%',
        plugins: {
          legend: {
            position: 'bottom',
            labels: { color: chartColors.text, padding: 16 },
          },
          tooltip: {
            callbacks: {
              label: function (c) { return c.label + ': ' + c.raw + '%'; },
            },
          },
        },
      },
      plugins: [donutDatalabelsPlugin],
    });
  }

  function initDifferences() {
    var ctx = document.getElementById('chart-differences');
    if (!ctx) return;
    new Chart(ctx, {
      type: 'bar',
      data: {
        labels: ['Renda Fixa', 'Tesouro', 'Fundos List.', 'Multimercado', 'Ações', 'Global'],
        datasets: [
          {
            label: 'Atual (%)',
            data: [87.55, 9.24, 3.19, 0, 0, 0],
            backgroundColor: 'rgba(13, 166, 255, 0.7)',
            borderColor: '#0da6ff',
            borderWidth: 1,
          },
          {
            label: 'Recomendado (%)',
            data: [67.5, 7.5, 2, 16.5, 5, 6],
            backgroundColor: 'rgba(116, 205, 255, 0.7)',
            borderColor: '#74cdff',
            borderWidth: 1,
          },
        ],
      },
      options: Object.assign({}, lightChartOptions, {
        scales: Object.assign({}, lightChartOptions.scales, {
          x: Object.assign({}, lightChartOptions.scales.x, { grid: { display: false } }),
          y: Object.assign({}, lightChartOptions.scales.y, {
            max: 100,
            ticks: Object.assign({}, lightChartOptions.scales.y.ticks, {
              callback: function (v) { return v + '%'; },
            }),
          }),
        }),
        plugins: Object.assign({}, lightChartOptions.plugins, {
          legend: { position: 'top' },
          tooltip: {
            callbacks: {
              label: function (c) { return c.dataset.label + ': ' + c.raw + '%'; },
            },
          },
        }),
      }),
    });
  }

  function init() {
    if (typeof Chart === 'undefined') {
      if (typeof window.chartInitAttempts === 'undefined') window.chartInitAttempts = 0;
      window.chartInitAttempts++;
      if (window.chartInitAttempts < 20) setTimeout(init, 100);
      return;
    }
    initPortfolioBars();
    initPortfolioDonut();
    initDifferences();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
