export function generateMockInfo(title: string, url?: string): string {
  const insights = [
    "This tool is particularly effective for businesses in the tourism and hospitality sector.",
    "Key features include advanced analytics, competitor monitoring, and AI-powered insights.",
    "The platform offers comprehensive reporting capabilities with customizable dashboards.",
    "Integration with major social media platforms provides real-time data collection.",
    "Pricing is competitive for the features offered, making it accessible to small businesses.",
    "Customer support is responsive and provides helpful onboarding assistance.",
    "The interface is user-friendly and requires minimal training to get started.",
    "Regular updates ensure the platform stays current with social media trends.",
    "API access allows for custom integrations with existing business tools.",
    "Mobile app availability enables monitoring on-the-go."
  ];

  const recommendations = [
    "Start with the basic plan to evaluate if it meets your needs.",
    "Take advantage of the free trial to test all features.",
    "Set up competitor monitoring to understand market positioning.",
    "Use the analytics dashboard to track key performance metrics.",
    "Schedule regular reports to stay informed about performance trends.",
    "Train your team on the platform's advanced features.",
    "Integrate with your existing marketing tools for seamless workflow.",
    "Monitor ROI by tracking conversion metrics over time.",
    "Use the platform's insights to inform content strategy.",
    "Regularly review and adjust your monitoring parameters."
  ];

  const randomInsights = insights
    .sort(() => Math.random() - 0.5)
    .slice(0, 3);
  
  const randomRecommendations = recommendations
    .sort(() => Math.random() - 0.5)
    .slice(0, 2);

  return `
    <div class="mock-info">
      <h4>About ${title}</h4>
      <p>${randomInsights.join(' ')}</p>
      
      <h4>Key Benefits</h4>
      <ul>
        <li>Advanced analytics and reporting</li>
        <li>Real-time competitor monitoring</li>
        <li>AI-powered insights and recommendations</li>
        <li>Customizable dashboards</li>
        <li>Multi-platform integration</li>
      </ul>
      
      <h4>Recommendations</h4>
      <ul>
        ${randomRecommendations.map(rec => `<li>${rec}</li>`).join('')}
      </ul>
      
      ${url ? `<p><strong>Website:</strong> <a href="${url}" target="_blank" rel="noopener">${url}</a></p>` : ''}
      
      <p><em>This information is generated for demonstration purposes. Please visit the official website for the most current details.</em></p>
    </div>
  `;
}
