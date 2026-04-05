(function () {
  'use strict';

  var CATEGORIES = {
    temperature: {
      label: 'Temperature',
      units: {
        C: { label: 'Celsius (C)' },
        F: { label: 'Fahrenheit (F)' },
        K: { label: 'Kelvin (K)' }
      },
      toBase: function (value, unit) {
        if (unit === 'C') return value;
        if (unit === 'F') return (value - 32) * 5 / 9;
        return value - 273.15;
      },
      fromBase: function (value, unit) {
        if (unit === 'C') return value;
        if (unit === 'F') return value * 9 / 5 + 32;
        return value + 273.15;
      }
    },
    length: {
      label: 'Length',
      units: {
        mm: { label: 'Millimeters (mm)', factor: 0.001 },
        cm: { label: 'Centimeters (cm)', factor: 0.01 },
        m: { label: 'Meters (m)', factor: 1 },
        km: { label: 'Kilometers (km)', factor: 1000 },
        in: { label: 'Inches (in)', factor: 0.0254 },
        ft: { label: 'Feet (ft)', factor: 0.3048 },
        yd: { label: 'Yards (yd)', factor: 0.9144 },
        mi: { label: 'Miles (mi)', factor: 1609.344 }
      }
    },
    weight: {
      label: 'Weight / Mass',
      units: {
        mg: { label: 'Milligrams (mg)', factor: 0.000001 },
        g: { label: 'Grams (g)', factor: 0.001 },
        kg: { label: 'Kilograms (kg)', factor: 1 },
        t: { label: 'Metric tons (t)', factor: 1000 },
        oz: { label: 'Ounces (oz)', factor: 0.028349523125 },
        lb: { label: 'Pounds (lb)', factor: 0.45359237 }
      }
    },
    speed: {
      label: 'Speed',
      units: {
        'm/s': { label: 'Meters per second (m/s)', factor: 1 },
        'km/h': { label: 'Kilometers per hour (km/h)', factor: 0.2777777778 },
        mph: { label: 'Miles per hour (mph)', factor: 0.44704 },
        knot: { label: 'Knots', factor: 0.5144444444 },
        'ft/s': { label: 'Feet per second (ft/s)', factor: 0.3048 }
      }
    }
  };

  function formatNumber(value) {
    if (value === 0) return '0';
    if (Math.abs(value) >= 1e12 || Math.abs(value) < 1e-4) return value.toExponential(4);
    return Number(value.toPrecision(8)).toLocaleString('en-US', { maximumFractionDigits: 10 });
  }

  function getCategory() {
    return CATEGORIES[document.getElementById('unit-category').value];
  }

  function populateUnits() {
    var categoryKey = document.getElementById('unit-category').value;
    var category = CATEGORIES[categoryKey];
    var sourceSelect = document.getElementById('unit-source');
    sourceSelect.innerHTML = '';
    Object.keys(category.units).forEach(function (key) {
      var option = document.createElement('option');
      option.value = key;
      option.textContent = category.units[key].label;
      sourceSelect.appendChild(option);
    });
  }

  function convertValue(value, category, sourceUnit, targetUnit) {
    if (category.toBase) {
      return category.fromBase(category.toBase(value, sourceUnit), targetUnit);
    }
    var baseValue = value * category.units[sourceUnit].factor;
    return baseValue / category.units[targetUnit].factor;
  }

  function render() {
    var category = getCategory();
    var value = parseFloat(document.getElementById('unit-value').value);
    var sourceUnit = document.getElementById('unit-source').value;
    var tbody = document.querySelector('#unit-results tbody');

    if (isNaN(value)) {
      tbody.innerHTML = '<tr><td colspan="2" class="text-error">Enter a valid number.</td></tr>';
      return;
    }

    var rows = Object.keys(category.units).map(function (targetUnit) {
      return '<tr>' +
        '<td>' + window.mtools.escapeHtml(category.units[targetUnit].label) + '</td>' +
        '<td>' + window.mtools.escapeHtml(formatNumber(convertValue(value, category, sourceUnit, targetUnit))) + '</td>' +
        '</tr>';
    }).join('');

    tbody.innerHTML = rows;
  }

  document.addEventListener('DOMContentLoaded', function () {
    var categorySelect = document.getElementById('unit-category');
    Object.keys(CATEGORIES).forEach(function (key) {
      var option = document.createElement('option');
      option.value = key;
      option.textContent = CATEGORIES[key].label;
      categorySelect.appendChild(option);
    });

    categorySelect.addEventListener('change', function () {
      populateUnits();
      render();
    });
    document.getElementById('unit-source').addEventListener('change', render);
    document.getElementById('unit-value').addEventListener('input', render);

    categorySelect.value = 'temperature';
    populateUnits();
    render();
  });
})();