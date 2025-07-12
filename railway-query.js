// Скрипт для получения проектов и сервисов из Railway API
const RAILWAY_TOKEN = 'df5658c8-57a0-4aef-b8ca-e374013e5ead';
const RAILWAY_API = 'https://backboard.railway.com/graphql/v2';

// GraphQL запрос для получения всех проектов и их сервисов
const GET_PROJECTS_QUERY = `
  query {
    projects {
      edges {
        node {
          id
          name
          services {
            edges {
              node {
                id
                name
                domains {
                  serviceDomains {
                    domain
                  }
                  customDomains {
                    domain
                  }
                }
              }
            }
          }
        }
      }
    }
  }
`;

async function fetchRailwayProjects() {
  try {
    const response = await fetch(RAILWAY_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RAILWAY_TOKEN}`,
      },
      body: JSON.stringify({
        query: GET_PROJECTS_QUERY
      })
    });

    const data = await response.json();
    
    if (data.errors) {
      console.error('GraphQL Errors:', data.errors);
      return;
    }

    console.log('🚀 Railway Projects and Services:');
    console.log('=====================================');
    
    data.data.projects.edges.forEach(({ node: project }) => {
      console.log(`\n📂 Project: ${project.name} (${project.id})`);
      
      project.services.edges.forEach(({ node: service }) => {
        console.log(`  🔧 Service: ${service.name} (${service.id})`);
        
        // Показываем домены
        if (service.domains.serviceDomains.length > 0) {
          service.domains.serviceDomains.forEach(domain => {
            console.log(`    🌐 Service Domain: https://${domain.domain}`);
          });
        }
        
        if (service.domains.customDomains.length > 0) {
          service.domains.customDomains.forEach(domain => {
            console.log(`    🎯 Custom Domain: https://${domain.domain}`);
          });
        }
      });
    });

    // Ищем RPA-related services
    console.log('\n🤖 RPA Related Services:');
    console.log('=========================');
    
    data.data.projects.edges.forEach(({ node: project }) => {
      project.services.edges.forEach(({ node: service }) => {
        const serviceName = service.name.toLowerCase();
        if (serviceName.includes('rpa') || serviceName.includes('bot') || serviceName.includes('automation')) {
          console.log(`\n🎯 FOUND RPA SERVICE: ${service.name}`);
          console.log(`   Project: ${project.name}`);
          
          if (service.domains.serviceDomains.length > 0) {
            const rpaDomain = service.domains.serviceDomains[0].domain;
            console.log(`   🚀 ENDPOINT: https://${rpaDomain}`);
            console.log(`   Add this to Supabase secrets as RPA_BOT_ENDPOINT: https://${rpaDomain}`);
          }
        }
      });
    });

  } catch (error) {
    console.error('❌ Error fetching Railway data:', error);
  }
}

fetchRailwayProjects();