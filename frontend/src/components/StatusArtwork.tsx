'use client';

import React from 'react';

interface StatusArtworkProps {
  style?: string;
  accentColor?: string;
  cardBg?: string;
  className?: string;
}

export function StatusArtwork({
  style = 'synthwave_sun',
  accentColor = '#f43f5e',
  className = '',
}: StatusArtworkProps) {
  if (!style || style === 'none') return null;

  return (
    <div className={`relative w-full overflow-hidden flex items-center justify-center py-2 select-none ${className}`}>
      {style === 'synthwave_sun' && (
        <svg
          viewBox="0 0 600 180"
          className="w-full max-w-lg h-36 sm:h-44 filter drop-shadow-md transition-all duration-300"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id="sunGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#fef08a" />
              <stop offset="40%" stopColor="#f43f5e" />
              <stop offset="100%" stopColor="#881337" />
            </linearGradient>

            <linearGradient id="gridGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={accentColor} stopOpacity="0.8" />
              <stop offset="100%" stopColor={accentColor} stopOpacity="0.0" />
            </linearGradient>

            <mask id="sunLines">
              <rect width="600" height="180" fill="white" />
              <rect x="0" y="55" width="600" height="3" fill="black" />
              <rect x="0" y="65" width="600" height="4" fill="black" />
              <rect x="0" y="77" width="600" height="5" fill="black" />
              <rect x="0" y="91" width="600" height="6" fill="black" />
              <rect x="0" y="107" width="600" height="8" fill="black" />
            </mask>
          </defs>

          {/* Glowing Retro Sun */}
          <circle cx="300" cy="70" r="55" fill="url(#sunGrad)" mask="url(#sunLines)" />

          {/* Mountain Silhouette Line */}
          <path
            d="M 50 120 L 140 85 L 210 105 L 280 75 L 340 100 L 410 70 L 480 100 L 550 120 Z"
            fill="#050505"
            opacity="0.9"
          />
          <path
            d="M 50 120 L 140 85 L 210 105 L 280 75 L 340 100 L 410 70 L 480 100 L 550 120"
            stroke={accentColor}
            strokeWidth="1.5"
            strokeOpacity="0.6"
          />

          {/* Perspective Horizon Grid */}
          <line x1="50" y1="120" x2="550" y2="120" stroke="url(#gridGrad)" strokeWidth="2" />
          <line x1="50" y1="132" x2="550" y2="132" stroke="url(#gridGrad)" strokeWidth="1.5" strokeOpacity="0.8" />
          <line x1="50" y1="147" x2="550" y2="147" stroke="url(#gridGrad)" strokeWidth="1" strokeOpacity="0.6" />
          <line x1="50" y1="165" x2="550" y2="165" stroke="url(#gridGrad)" strokeWidth="0.8" strokeOpacity="0.4" />

          {/* Perspective Radial Lines */}
          <line x1="300" y1="120" x2="100" y2="180" stroke="url(#gridGrad)" strokeWidth="1.5" strokeOpacity="0.7" />
          <line x1="300" y1="120" x2="200" y2="180" stroke="url(#gridGrad)" strokeWidth="1.5" strokeOpacity="0.7" />
          <line x1="300" y1="120" x2="300" y2="180" stroke="url(#gridGrad)" strokeWidth="1.5" strokeOpacity="0.7" />
          <line x1="300" y1="120" x2="400" y2="180" stroke="url(#gridGrad)" strokeWidth="1.5" strokeOpacity="0.7" />
          <line x1="300" y1="120" x2="500" y2="180" stroke="url(#gridGrad)" strokeWidth="1.5" strokeOpacity="0.7" />

          {/* Distant Stars */}
          <circle cx="120" cy="30" r="1.5" fill="#ffffff" opacity="0.8" />
          <circle cx="180" cy="45" r="1" fill="#ffffff" opacity="0.6" />
          <circle cx="420" cy="25" r="1.5" fill="#ffffff" opacity="0.9" />
          <circle cx="490" cy="40" r="1" fill="#ffffff" opacity="0.5" />
        </svg>
      )}

      {style === 'cyber_nodes' && (
        <svg
          viewBox="0 0 600 160"
          className="w-full max-w-lg h-32 sm:h-40"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id="nodeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={accentColor} />
              <stop offset="100%" stopColor="#10b981" />
            </linearGradient>
          </defs>

          {/* Interconnected Server Nodes */}
          <line x1="120" y1="80" x2="240" y2="40" stroke={accentColor} strokeWidth="1.5" strokeDasharray="4 4" opacity="0.6" />
          <line x1="240" y1="40" x2="360" y2="90" stroke={accentColor} strokeWidth="1.5" strokeDasharray="4 4" opacity="0.6" />
          <line x1="360" y1="90" x2="480" y2="50" stroke={accentColor} strokeWidth="1.5" strokeDasharray="4 4" opacity="0.6" />
          <line x1="120" y1="80" x2="360" y2="90" stroke={accentColor} strokeWidth="1" opacity="0.3" />
          <line x1="240" y1="40" x2="480" y2="50" stroke={accentColor} strokeWidth="1" opacity="0.3" />

          {/* Node Beacons */}
          <circle cx="120" cy="80" r="14" fill="#0d0d0d" stroke={accentColor} strokeWidth="2" />
          <circle cx="120" cy="80" r="6" fill={accentColor} />

          <circle cx="240" cy="40" r="18" fill="#0d0d0d" stroke="#10b981" strokeWidth="2" />
          <circle cx="240" cy="40" r="8" fill="#10b981" />

          <circle cx="360" cy="90" r="22" fill="#0d0d0d" stroke={accentColor} strokeWidth="2" />
          <circle cx="360" cy="90" r="10" fill={accentColor} />
          <circle cx="360" cy="90" r="30" stroke={accentColor} strokeWidth="1" strokeDasharray="3 3" opacity="0.5" />

          <circle cx="480" cy="50" r="14" fill="#0d0d0d" stroke="#3b82f6" strokeWidth="2" />
          <circle cx="480" cy="50" r="6" fill="#3b82f6" />
        </svg>
      )}

      {style === 'waveform_pulse' && (
        <svg
          viewBox="0 0 600 140"
          className="w-full max-w-lg h-28 sm:h-36"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id="waveFill" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={accentColor} stopOpacity="0.4" />
              <stop offset="100%" stopColor={accentColor} stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Wave Area Fill */}
          <path
            d="M 30 110 L 80 110 L 110 80 L 130 120 L 150 40 L 170 130 L 190 90 L 220 110 L 300 110 L 330 60 L 350 125 L 370 20 L 390 135 L 420 85 L 450 110 L 570 110 Z"
            fill="url(#waveFill)"
          />

          {/* Wave Stroke Line */}
          <path
            d="M 30 110 L 80 110 L 110 80 L 130 120 L 150 40 L 170 130 L 190 90 L 220 110 L 300 110 L 330 60 L 350 125 L 370 20 L 390 135 L 420 85 L 450 110 L 570 110"
            stroke={accentColor}
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Glowing Peak Points */}
          <circle cx="150" cy="40" r="4" fill="#ffffff" />
          <circle cx="370" cy="20" r="5" fill="#ffffff" />
        </svg>
      )}

      {style === 'matrix_rain' && (
        <div className="w-full max-w-lg h-28 sm:h-36 bg-neutral-950/80 rounded-xl p-3 font-mono text-[10px] text-emerald-400 opacity-90 overflow-hidden flex flex-col justify-between border-none">
          <div className="flex justify-between tracking-widest text-emerald-300 font-bold">
            <span>01001001 01010011 01001111 01010000 01000101 01010010 01000001 01010100 01001001 01001111 01001110 01000001 01001100</span>
          </div>
          <div className="flex justify-around text-emerald-500/60 font-mono text-xs leading-none">
            <div className="space-y-1"><div>W</div><div>A</div><div>K</div><div>E</div><div>U</div><div>P</div></div>
            <div className="space-y-1"><div>2</div><div>0</div><div>2</div><div>6</div><div>.</div><div>0</div></div>
            <div className="space-y-1 text-emerald-300 font-bold"><div>1</div><div>0</div><div>0</div><div>%</div><div>⚡</div></div>
            <div className="space-y-1"><div>O</div><div>N</div><div>L</div><div>I</div><div>N</div><div>E</div></div>
            <div className="space-y-1 opacity-40"><div>0</div><div>1</div><div>0</div><div>1</div><div>0</div><div>1</div></div>
          </div>
        </div>
      )}

      {style === 'isometric_servers' && (
        <svg
          viewBox="0 0 600 160"
          className="w-full max-w-lg h-32 sm:h-40"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Tower 1 */}
          <g transform="translate(140, 30)">
            <polygon points="50,0 100,25 50,50 0,25" fill="#171717" stroke="#333" />
            <polygon points="0,25 50,50 50,110 0,85" fill="#0d0d0d" stroke="#262626" />
            <polygon points="50,50 100,25 100,85 50,110" fill="#1c1c1c" stroke="#262626" />
            <circle cx="20" cy="50" r="2.5" fill="#10b981" />
            <circle cx="30" cy="55" r="2.5" fill="#10b981" />
            <circle cx="40" cy="60" r="2.5" fill="#10b981" />
          </g>
          {/* Tower 2 */}
          <g transform="translate(250, 10)">
            <polygon points="50,0 100,25 50,50 0,25" fill="#1f1f1f" stroke={accentColor} strokeWidth="1.5" />
            <polygon points="0,25 50,50 50,120 0,95" fill="#0d0d0d" stroke="#262626" />
            <polygon points="50,50 100,25 100,95 50,120" fill="#171717" stroke="#262626" />
            <circle cx="20" cy="55" r="3" fill={accentColor} />
            <circle cx="32" cy="61" r="3" fill="#10b981" />
            <circle cx="44" cy="67" r="3" fill="#3b82f6" />
          </g>
          {/* Tower 3 */}
          <g transform="translate(360, 40)">
            <polygon points="50,0 100,25 50,50 0,25" fill="#171717" stroke="#333" />
            <polygon points="0,25 50,50 50,100 0,75" fill="#0d0d0d" stroke="#262626" />
            <polygon points="50,50 100,25 100,75 50,100" fill="#1c1c1c" stroke="#262626" />
            <circle cx="20" cy="45" r="2.5" fill="#10b981" />
            <circle cx="30" cy="50" r="2.5" fill="#10b981" />
          </g>
        </svg>
      )}

      {style === 'constellation' && (
        <svg
          viewBox="0 0 600 140"
          className="w-full max-w-lg h-28 sm:h-36"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <polygon points="100,30 200,90 150,120 80,80" stroke={accentColor} strokeWidth="1" strokeDasharray="3 3" opacity="0.4" fill="none" />
          <polygon points="200,90 320,30 400,100 280,120" stroke={accentColor} strokeWidth="1" opacity="0.5" fill="none" />
          <polygon points="320,30 460,40 500,110 400,100" stroke={accentColor} strokeWidth="1" strokeDasharray="2 2" opacity="0.4" fill="none" />
          <circle cx="100" cy="30" r="4" fill="#ffffff" />
          <circle cx="200" cy="90" r="5" fill={accentColor} />
          <circle cx="320" cy="30" r="6" fill="#ffffff" />
          <circle cx="400" cy="100" r="5" fill="#10b981" />
          <circle cx="460" cy="40" r="4" fill="#ffffff" />
        </svg>
      )}

      {style === 'origami_geometric' && (
        <svg
          viewBox="0 0 600 150"
          className="w-full max-w-lg h-30 sm:h-38"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <g transform="translate(200, 10)">
            <polygon points="100,0 200,50 100,140 0,50" fill="#0d0d0d" stroke={accentColor} strokeWidth="1.5" />
            <polygon points="100,0 200,50 100,65" fill={accentColor} opacity="0.2" />
            <polygon points="100,0 0,50 100,65" fill={accentColor} opacity="0.3" />
            <polygon points="0,50 100,140 100,65" fill={accentColor} opacity="0.15" />
            <polygon points="200,50 100,140 100,65" fill={accentColor} opacity="0.25" />
          </g>
        </svg>
      )}

    </div>
  );
}

/**
 * Background SVG Pattern Overlay
 */
export function StatusPatternOverlay({ pattern = 'grid' }: { pattern?: string }) {
  if (!pattern || pattern === 'none') return null;

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-15">
      {pattern === 'grid' && (
        <div
          className="w-full h-full"
          style={{
            backgroundImage: `radial-gradient(rgba(255, 255, 255, 0.25) 1px, transparent 1px)`,
            backgroundSize: '24px 24px',
          }}
        />
      )}
      {pattern === 'dots' && (
        <div
          className="w-full h-full"
          style={{
            backgroundImage: `radial-gradient(rgba(255, 255, 255, 0.4) 1.5px, transparent 1.5px)`,
            backgroundSize: '16px 16px',
          }}
        />
      )}
      {pattern === 'hexagon' && (
        <svg className="w-full h-full" width="100%" height="100%">
          <pattern id="hexPattern" width="40" height="40" patternUnits="userSpaceOnUse">
            <path
              d="M 20 0 L 40 11.5 L 40 34.5 L 20 46 L 0 34.5 L 0 11.5 Z"
              fill="none"
              stroke="#ffffff"
              strokeWidth="0.8"
              strokeOpacity="0.4"
            />
          </pattern>
          <rect width="100%" height="100%" fill="url(#hexPattern)" />
        </svg>
      )}
      {pattern === 'circuit' && (
        <svg className="w-full h-full" width="100%" height="100%">
          <pattern id="circuitPattern" width="60" height="60" patternUnits="userSpaceOnUse">
            <path d="M 0 30 H 60 M 30 0 V 60" stroke="#ffffff" strokeWidth="0.5" strokeOpacity="0.3" />
            <circle cx="30" cy="30" r="3" fill="#ffffff" fillOpacity="0.3" />
          </pattern>
          <rect width="100%" height="100%" fill="url(#circuitPattern)" />
        </svg>
      )}
    </div>
  );
}

/**
 * Interactive System Latency Heartbeat Waveform
 */
export function StatusHeartbeatGraph({ accentColor = '#f43f5e' }: { accentColor?: string }) {
  return (
    <div className="w-full bg-black/40 rounded-xl p-3 border-none space-y-2 select-none">
      <div className="flex items-center justify-between text-[10px] uppercase font-mono font-bold">
        <span className="flex items-center gap-1.5" style={{ color: accentColor }}>
          <span className="w-2 h-2 rounded-full animate-ping" style={{ backgroundColor: accentColor }} />
          LIVE SYSTEM HEARTBEAT GRAPH
        </span>
        <span className="opacity-60 text-white">LATENCY: 99.99% UPTIME AVG 42MS</span>
      </div>

      <svg viewBox="0 0 500 50" className="w-full h-10 overflow-visible" fill="none">
        <defs>
          <linearGradient id="hbGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={accentColor} stopOpacity="0.5" />
            <stop offset="100%" stopColor={accentColor} stopOpacity="0.0" />
          </linearGradient>
        </defs>

        <path
          d="M 0 25 L 60 25 L 80 25 L 95 10 L 110 40 L 125 5 L 140 45 L 155 25 L 240 25 L 255 15 L 270 35 L 285 25 L 360 25 L 375 8 L 390 42 L 405 25 L 500 25 V 50 H 0 Z"
          fill="url(#hbGrad)"
        />

        <path
          d="M 0 25 L 60 25 L 80 25 L 95 10 L 110 40 L 125 5 L 140 45 L 155 25 L 240 25 L 255 15 L 270 35 L 285 25 L 360 25 L 375 8 L 390 42 L 405 25 L 500 25"
          stroke={accentColor}
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        <circle cx="375" cy="8" r="3" fill="#ffffff" />
      </svg>
    </div>
  );
}
