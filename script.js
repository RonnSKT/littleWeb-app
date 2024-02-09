// Função para enviar mensagem para o Discord via webhook
function enviarMensagemDiscord(localizacao) {
    const webhookURL = 'https://discord.com/api/webhooks/1205519125603160094/ocwJ60PohJEbl0oUCKSKAg6FAIMeg6Rjn_YU64Atfun0JFOtJOfD3kuwMNlO8Xb8WAST'; // Substitua pelo URL do seu webhook do Discord
    
    const mensagem = `Nova pessoa acessou o site em: ${localizacao}`;
  
    fetch(webhookURL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ content: mensagem }),
    })
    .then(response => console.log('Mensagem enviada para o Discord'))
    .catch(error => console.error('Erro ao enviar mensagem para o Discord:', error));
  }
  
  // Função para obter a localização do usuário e enviar mensagem para o Discord
  function obterLocalizacaoEEnviarMensagem() {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(posicao => {
        const latitude = posicao.coords.latitude;
        const longitude = posicao.coords.longitude;
    
        // Chamada para API de geocodificação reversa para obter a cidade
        const apiURL = `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`;
  
        fetch(apiURL)
          .then(response => response.json())
          .then(data => {
            const cidade = data.address.city;
            console.log("Cidade:", cidade);
  
            // Enviar mensagem para o Discord
            enviarMensagemDiscord(cidade);
          })
          .catch(error => {
            console.error("Erro ao obter a cidade:", error);
          });
      });
    } else {
      console.log("Geolocalização não é suportada neste navegador.");
    }
  }
  
  // Chamar a função para obter a localização e enviar mensagem quando o documento estiver pronto
  document.addEventListener("DOMContentLoaded", obterLocalizacaoEEnviarMensagem);
  
