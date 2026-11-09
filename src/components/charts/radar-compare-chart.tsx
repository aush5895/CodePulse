'use client';

import { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import { motion } from 'motion/react';
import { CHART_THEME } from '@/lib/constants';
import { cn } from '@/lib/utils';

const DEFAULT_INDICATORS = [
  { name: 'Commits', max: 30000 },
  { name: 'Pull Requests', max: 2500 },
  { name: 'Issues', max: 1000 },
  { name: 'Code Reviews', max: 2500 },
  { name: 'Stars', max: 20000 },
  { name: 'Streak', max: 365 },
] as const;

const DEVELOPER_COLORS = [
  { line: '#8b5cf6', area: 'rgba(139, 92, 246, 0.2)' },
  { line: '#06b6d4', area: 'rgba(6, 182, 212, 0.2)' },
  { line: '#f59e0b', area: 'rgba(245, 158, 11, 0.2)' },
  { line: '#ec4899', area: 'rgba(236, 72, 153, 0.2)' },
  { line: '#10b981', area: 'rgba(16, 185, 129, 0.2)' },
] as const;

export interface RadarDeveloperData {
  name: string;
  values: number[];
  color?: { line: string; area: string };
}

interface RadarIndicator {
  name: string;
  max: number;
}

interface RadarCompareChartProps {
  className?: string;
  developers: RadarDeveloperData[];
  indicators?: RadarIndicator[];
  title?: string;
  hideTitle?: boolean;
  hideBackground?: boolean;
  hideLegend?: boolean;
}

export function RadarCompareChart({
  className,
  developers,
  indicators,
  title = 'Developer Comparison',
  hideTitle = false,
  hideBackground = false,
  hideLegend = false,
}: RadarCompareChartProps) {
  // Dynamically calculate the maximum for each indicator so the chart fills out
  const radarIndicators = useMemo(() => {
    if (indicators) return indicators;
    
    // Find the max value for each of the 6 dimensions
    const maxVals = [0, 0, 0, 0, 0, 0];
    developers.forEach(dev => {
      dev.values.forEach((val, i) => {
        if (i < 6 && val > maxVals[i]) maxVals[i] = val;
      });
    });

    return DEFAULT_INDICATORS.map((ind, i) => ({
      name: ind.name,
      // Use the max value among developers + 20% padding, with a reasonable floor
      max: Math.max(10, Math.ceil(maxVals[i] * 1.2))
    }));
  }, [developers, indicators]);

  const option = useMemo(() => {
    const series = developers.map((dev, index) => {
      const colorSet = dev.color ?? DEVELOPER_COLORS[index % DEVELOPER_COLORS.length];
      return {
        value: dev.values,
        name: dev.name,
        symbol: 'circle',
        symbolSize: 6,
        lineStyle: {
          width: 2,
          color: colorSet.line,
        },
        areaStyle: {
          color: colorSet.area,
        },
        itemStyle: {
          color: colorSet.line,
          borderColor: colorSet.line,
          borderWidth: 2,
        },
        emphasis: {
          lineStyle: { width: 3 },
          areaStyle: {
            color: colorSet.area.replace('0.2', '0.35'),
          },
        },
      };
    });

    return {
      ...CHART_THEME,
      tooltip: {
        ...CHART_THEME.tooltip,
        trigger: 'item',
      },
      legend: hideLegend ? { show: false } : {
        bottom: 8,
        itemGap: 24,
        itemWidth: 12,
        itemHeight: 12,
        icon: 'circle',
        textStyle: {
          color: '#94a3b8',
          fontSize: 12,
          fontFamily: 'Inter, system-ui, sans-serif',
        },
        data: developers.map((dev, i) => ({
          name: dev.name,
          itemStyle: {
            color: (dev.color ?? DEVELOPER_COLORS[i % DEVELOPER_COLORS.length]).line,
          },
        })),
      },
      radar: {
        center: ['50%', '48%'],
        radius: '65%',
        indicator: radarIndicators.map((ind) => ({
          name: ind.name,
          max: ind.max,
        })),
        shape: 'polygon',
        axisName: {
          color: '#94a3b8',
          fontSize: 11,
          fontFamily: 'Inter, system-ui, sans-serif',
        },
        splitArea: {
          areaStyle: {
            color: [
              'rgba(139, 92, 246, 0.02)',
              'rgba(139, 92, 246, 0.04)',
              'rgba(139, 92, 246, 0.02)',
              'rgba(139, 92, 246, 0.04)',
              'rgba(139, 92, 246, 0.02)',
            ],
          },
        },
        splitLine: {
          lineStyle: {
            color: 'rgba(255, 255, 255, 0.06)',
          },
        },
        axisLine: {
          lineStyle: {
            color: 'rgba(255, 255, 255, 0.08)',
          },
        },
      },
      series: [
        {
          type: 'radar',
          data: series,
        },
      ],
      animation: true,
      animationDuration: 1000,
      animationEasing: 'cubicOut',
    };
  }, [developers, radarIndicators]);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: 'spring', stiffness: 260, damping: 24 }}
      className={cn(
        !hideBackground && 'glass-card rounded-[32px] border border-white/5 p-8 relative overflow-hidden group',
        'h-full w-full',
        className
      )}
    >
      {/* Neon Glow */}
      {!hideBackground && <div className="absolute -top-20 -left-20 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none group-hover:bg-cyan-500/20 transition-colors duration-700" />}
      
      {!hideTitle && (
        <h3 className="mb-6 text-xl font-bold tracking-tight text-white relative z-10 flex items-center gap-2">
          <svg className="w-5 h-5 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
          </svg>
          {title === 'Developer Comparison' ? 'Tech Stack Mastery' : title}
        </h3>
      )}
      <ReactECharts
        option={option}
        style={{ height: '350px', width: '100%' }}
        opts={{ renderer: 'canvas' }}
        theme="dark"
      />
    </motion.div>
  );
}
