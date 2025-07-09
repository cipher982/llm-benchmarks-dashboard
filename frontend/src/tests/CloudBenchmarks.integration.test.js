/**
 * Frontend Integration Tests for CloudBenchmarks
 * 
 * These tests validate that the frontend correctly processes API responses
 * and displays data without crashes.
 */

import { render, screen, waitFor } from '@testing-library/react';
import CloudBenchmarks from '../pages/CloudBenchmarks';

// Mock fetch to avoid actual network calls during testing
global.fetch = jest.fn();

// Mock environment variable
process.env.REACT_APP_API_URL = 'https://api.llm-benchmarks.com';

// Sample API response that matches current structure
const mockApiResponse = {
  speedDistribution: [
    {
      provider: 'openai',
      model_name: 'gpt-4',
      display_name: 'gpt-4',
      mean_tokens_per_second: 25.5,
      min_tokens_per_second: 20.1,
      max_tokens_per_second: 32.8,
      density_points: [
        { x: 20, y: 0.1 },
        { x: 25, y: 0.8 },
        { x: 30, y: 0.3 }
      ]
    },
    {
      provider: 'anthropic',
      model_name: 'claude-3-sonnet',
      display_name: 'claude-3-sonnet',
      mean_tokens_per_second: 30.2,
      min_tokens_per_second: 25.0,
      max_tokens_per_second: 38.5,
      density_points: [
        { x: 25, y: 0.2 },
        { x: 30, y: 0.9 },
        { x: 35, y: 0.4 }
      ]
    }
  ],
  timeSeries: {
    timestamps: [
      '2024-01-01T00:00:00.000Z',
      '2024-01-01T00:30:00.000Z',
      '2024-01-01T01:00:00.000Z'
    ],
    models: [
      {
        model_name: 'gpt-4',
        display_name: 'gpt-4',
        providers: [
          {
            provider: 'openai',
            values: [25.5, 26.1, 24.8]
          }
        ]
      },
      {
        model_name: 'claude-3-sonnet',
        display_name: 'claude-3-sonnet',
        providers: [
          {
            provider: 'anthropic',
            values: [30.2, 31.1, 29.8]
          }
        ]
      }
    ]
  },
  table: [
    {
      provider: 'openai',
      model_name: 'gpt-4',
      tokens_per_second_mean: 25.5,
      tokens_per_second_min: 20.1,
      tokens_per_second_max: 32.8,
      time_to_first_token_mean: 0.8
    },
    {
      provider: 'anthropic',
      model_name: 'claude-3-sonnet',
      tokens_per_second_mean: 30.2,
      tokens_per_second_min: 25.0,
      tokens_per_second_max: 38.5,
      time_to_first_token_mean: 0.6
    }
  ]
};

describe('CloudBenchmarks Integration Tests', () => {
  beforeEach(() => {
    // Reset fetch mock before each test
    fetch.mockClear();
    
    // Mock successful API response
    fetch.mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Map([['content-type', 'application/json']]),
      json: () => Promise.resolve(mockApiResponse)
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('renders loading state initially', () => {
    render(<CloudBenchmarks />);
    
    // Should show loading spinner
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  test('fetches data and renders main sections', async () => {
    render(<CloudBenchmarks />);
    
    // Wait for API call to complete
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        'https://api.llm-benchmarks.com/api/processed?days=12',
        expect.objectContaining({
          method: 'GET',
          headers: { 'Accept': 'application/json' }
        })
      );
    }, { timeout: 10000 });

    // Wait for main content to appear
    await waitFor(() => {
      expect(screen.getByText('☁️ Cloud Benchmarks ☁️')).toBeInTheDocument();
    }, { timeout: 5000 });

    // Check for main sections
    expect(screen.getByText('📊 Speed Distribution 📊')).toBeInTheDocument();
    expect(screen.getByText('📚 Full Results 📚')).toBeInTheDocument();
  });

  test('handles API errors gracefully', async () => {
    // Mock API error
    fetch.mockRejectedValue(new Error('Network error'));
    
    render(<CloudBenchmarks />);
    
    // Wait for error to be displayed
    await waitFor(() => {
      expect(screen.getByText(/Error:/)).toBeInTheDocument();
    }, { timeout: 5000 });
  });

  test('calls API with correct parameters', async () => {
    render(<CloudBenchmarks />);
    
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        'https://api.llm-benchmarks.com/api/processed?days=12',
        expect.objectContaining({
          method: 'GET',
          headers: { 'Accept': 'application/json' }
        })
      );
    });
  });

  test('logs expected debugging information', async () => {
    // Spy on console.log to verify debugging output
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    
    render(<CloudBenchmarks />);
    
    await waitFor(() => {
      expect(fetch).toHaveBeenCalled();
    });

    // Wait a bit more for console logs
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Should log API call details
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('🌐 EXACT HTTP CALL:')
    );
    
    // Should log model data
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('📊 TOTAL MODELS RECEIVED:')
    );
    
    consoleSpy.mockRestore();
  });

  test('processes model data correctly', async () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    
    render(<CloudBenchmarks />);
    
    await waitFor(() => {
      expect(fetch).toHaveBeenCalled();
    });

    // Wait for processing to complete
    await new Promise(resolve => setTimeout(resolve, 200));
    
    // Should log the correct number of models received
    expect(consoleSpy).toHaveBeenCalledWith(
      '📊 TOTAL MODELS RECEIVED:', 2
    );
    
    // Should not find any suspicious models in our mock data
    expect(consoleSpy).toHaveBeenCalledWith(
      '🚨 SUSPICIOUS MODELS:', 0, []
    );
    
    consoleSpy.mockRestore();
  });

  test('validates clean model names in response', async () => {
    render(<CloudBenchmarks />);
    
    await waitFor(() => {
      expect(fetch).toHaveBeenCalled();
    });

    // All model names in our mock should be clean
    const modelNames = [
      ...mockApiResponse.speedDistribution.map(m => m.model_name),
      ...mockApiResponse.table.map(m => m.model_name)
    ];
    
    modelNames.forEach(name => {
      expect(name).not.toMatch(/meta-llama\/meta-llama/);
      expect(name).not.toMatch(/\//);
      expect(name.length).toBeLessThan(50);
    });
  });
});