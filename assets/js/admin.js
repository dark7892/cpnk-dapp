$( document ).ready(function() {
  var balance = 0;
  var qty = 0;
  var total_cost = 0;
  var wallet_connect_flag = false;
  var wallet_address = "";
  var NFT_contract;
  var total = 0;
  var nft_price = 500;
  var watch_time = 3500;
  var rewards_amount = 0;
  
  var mint_active_settime = "";
  var contract_watch_settime = "";
  
  var set_chainId = 16; //1: mainnet, 4: rinkeby
  var curr_chainId = "";

  $("#initialize").hide();
  $("#mint").hide();
  
  if (typeof ethereum !== 'undefined') {
      web3obj = new Web3(ethereum);
  } else {
      alert('No MetaMask! Please install the MetaMask!');
      $("#othernet").text("Please install the MetaMask!");
      return;
  }

  if(typeof web3obj === 'undefined') {
    web3obj = new Web3(Web3.givenProvider);
  }
  
  console.log("<-------------------------------------------------   web3 provider   ------------------------------------------------->\n", web3obj);
  
  try {
    NFT_contract = new web3obj.eth.Contract(ABI, ADDRESS);// for mint
  } catch (err) {console.log("contract read error: ", err)}
  
  console.log("<-------------------------------------------------   Contract methods   ------------------------------------------------->\n", NFT_contract);
  
  (async () => {
    try {
      curr_chainId = await ethereum.chainId;

      loading();
      if(set_chainId == curr_chainId) {
        mint_active_watch();
      } else {
        other_network();
      }
      unloading();

      await web3obj.currentProvider.on('accountsChanged', () => {
        if(wallet_connect_flag) {
          clearTimeout(contract_watch_settime);
          disconnect();
          mint_active_watch();
          alert("Wallet address has changed. Reconnect new wallet!")
        }
      });

      await web3obj.currentProvider.on('chainChanged', (chid) => {
        curr_chainId = chid;
        if(curr_chainId != set_chainId) {
          clearTimeout(mint_active_settime);
          clearTimeout(contract_watch_settime);
          disconnect();
          other_network();
          alert("Network has changed. Please change network to Songbird Network!")
        } else {
          mint_active_watch();
        }
      });
    } catch (err) {console.log("error: ", err)}
  })();

  $(".connect_bt").click(function(e) {
    e.preventDefault();
    if(!wallet_connect_flag) {
        wallet_connect();
    }
  })

  $("#changenet").click(function(e) {
    e.preventDefault();
    networkchange();
  })
  
  $("#buy").click(function(e) {
    e.preventDefault();
    buy();
  })

  $("#claim").click(function(e) {
    e.preventDefault();
    claim();
  })

  $("#init").click(function(e) {
    e.preventDefault();
    initialize();
  })
  
  $("#freeMint").click(function(e) {
    e.preventDefault();
    freeMint();
  })

  $("#setipfs").click(function(e) {
    e.preventDefault();
    setBaseTokenURI();
  })

  $("#setdev1percent").click(function(e) {
    e.preventDefault();
    setdev1percent();
  })

  $("#setdev2percent").click(function(e) {
    e.preventDefault();
    setdev2percent();
  })

  $("#setdev1address").click(function(e) {
    e.preventDefault();
    setdev1address();
  })

  $("#setdev2address").click(function(e) {
    e.preventDefault();
    setdev2address();
  })

  $("#withdraw").click(function(e) {
    e.preventDefault();
    withdraw();
  })

  $("#startmint").click(function(e) {
    e.preventDefault();
    startmint();
  })

  $("#eth-input").focus(function() {
    $(this).select();
  })

  $("#eth-input").keyup(function() {
    total_cost_view($(this).val());
  })

  $("#eth-input").change(function() {
    total_cost_view($(this).val());
  })

  $(".bottom-right").on("click", function (e) {
    e.preventDefault();
    $("html, body").animate({ scrollTop: 0 }, "100");
  });

  async function wallet_connect() {
    try {
       await web3obj.eth.requestAccounts()
        .then((acc) => {
          web3obj.eth.net.getId().then(async (id) => {
            if(set_chainId == id) {
              alert("Wallet Connect Success!");

              wallet_address = acc[0];
              wallet_connect_flag = true;
              getBalance(wallet_address);
              $("#address").text(wallet_address.substr(0, 15) + "…" + wallet_address.substr(wallet_address.length - 12, wallet_address.length));
              $("#address").attr("href", "https://etherscan.io/address/" + wallet_address);
              $(".connect_bt").text(wallet_address.substr(0, 4) + "…" + wallet_address.substr(wallet_address.length - 3, wallet_address.length));
              clearTimeout(mint_active_settime);
              contract_watch();
            } else {
              console.log(web3obj)
              alert("Please change network to Songbird Network!");
            }
          })
        })
        .catch((error) => {
          if (error.code === 4001) {
            console.log('Please connect to MetaMask.');
          } else {
            console.error(error);
          }
        });
    } catch (err){console.log("wallet_connect: ", err)}
  }

  function disconnect() {
    try {
      clearTimeout(contract_watch_settime);
      wallet_connect_flag = false;
      $("#address").text("Not Connected. Click CONNECT");
      $("#address").attr("href", "");
      $(".connect_bt").text("Connect");
      $("#ethbalance").text("0.000 SGB");
    } catch (err) {console.log("disconnect error: ", err)}
  }

  function other_network() {
    $(".connected").hide();
    $("#buy").hide();
    $("#othernet").text("Please change to Songbird Network!");
    $("#changenet").show();
  }

  function mint_is_true() {
    $("#changenet").hide();
    $("#othernet").text("");
    $("#buy").removeClass("disable");
    $("#buy").show();
    $(".connected").show();
    $(".mint-statue").text("MINTING is ON. MINT LIVE!");
  }

  async function mint_active_watch() {
    try {
      clearTimeout(contract_watch_settime);

      mint_is_true();
    } catch (err){console.log("mint_active_watch error: ", err)}

    mint_active_settime = setTimeout(() => {
      mint_active_watch();
    }, 1000);
  }

  async function contract_watch() {
    try {
      var owner = await NFT_contract.methods.owner().call();
      var isInitialized = await NFT_contract.methods.isInitialize().call();
      if (owner != wallet_address) {
        window.location.href = "index.html";
      }
      if(isInitialized) {
        $("#initialize").hide();
        $("#mint").show();
        total = await NFT_contract.methods.totalSupply().call();
        rewards_amount = await NFT_contract.methods.getRewardsAmount(wallet_address).call();
        mint_is_true();
        $('.totalsupply').text(total + " / 5000");
        $("#rewards").text(web3obj.utils.fromWei(rewards_amount.toString(), 'ether') + " SGB");
        total_cost_view($("#eth-input").val());
        var percent = (total * 100 / 5000).toFixed(2) + "%";
        $('.progress-value').text(percent);
        if(Math.round(total * 100/ 5000) < 10) {
          percent = "10%";
        }
        $('.progress-bar').width(percent);
        getBalance(wallet_address);
      } else {
        $("#initialize").show();
        $("#mint").hide();
      }

    } catch (err) { console.log("conract_ err", err)}

    contract_watch_settime = setTimeout(() => {
      contract_watch();
    }, watch_time);
  }

  async function networkchange() {
    try {
      await web3obj.currentProvider.request({
        method: 'wallet_switchEthereumChain',
        params: [{ 'chainId': '0x' + set_chainId.toString(16)}],
      });
    } catch (err) {console.log("change network error: " , err)}
  }

  async function getBalance(addr) {
    balance = await web3obj.eth.getBalance(addr);
    $("#ethbalance").text(balance != "none" ? (Math.round((balance / Math.pow(10, 18) + Number.EPSILON) * 10000) / 10000) + " SGB" : "wallet connect failed!");
  }

  async function buy() {
    try {
      qty = $("#eth-input").val();
      if(wallet_connect_flag) {
        if(qty >= 1 && qty <= 10) {
          if(Number(total_cost) < Number(balance)) {
            await NFT_contract.methods.mintCPNK(qty).send({value: web3obj.utils.toWei(total_cost.toString(), 'ether'), from: wallet_address}).on("receipt", async function (res) {
              alert("Transaction successful");
              try {
                total = await NFT_contract.methods.totalSupply().call();
                rewards_amount = await NFT_contract.methods.getRewardsAmount(wallet_address).call();
                $('.totalsupply').text(total + " / 5000");
                $("#rewards").text(rewards_amount);
                total_cost_view($("#eth-input").val());
                var percent = (total * 100 / 5000).toFixed(2) + "%";
                $('.progress-value').text(percent);
                if(Math.round(total * 100/ 5000) < 10) {
                  percent = "10%";
                }
                $('.progress-bar').width(percent);
                getBalance(wallet_address);
                
              } catch (err) {console.log("buy part again watch error: ", err)}
            }).on("error", function(res) {
              alert("Error in transaction");
            })
          } else {
            alert("The amount of SGB in your wallet is not sufficient!");
          }
        } else {
          alert("please check Qty! Max 10.");
        }
      } else {
        alert("Please connect to Songbird Mainnet!");
      }
    } catch (err) {console.log("Buy", err)}
  }

  async function total_cost_view(val) {
    if(val < 0 || val > 10) {
      if(val < 0) {
        $("#eth-input").val(0);
        val = 0;
      } else {
        $("#eth-input").val(10);
        val = 10;
      }
    }
    total_cost = val * nft_price;
    $("#total").text(total_cost);
  }

  async function initialize() {
    var royaltyPercent = $("#royaltyPercent").val();
    var dev1Percent = $("#dev1Percent").val();
    var dev2Percent = $("#dev2Percent").val();
    var dev1Address = $("#dev1Address").val();
    var dev2Address = $("#dev2Address").val();
    var salePercent = $("#salePercent").val();
    var baseTokenURI = $("#baseTokenURI").val();
    await NFT_contract.methods.initialize(royaltyPercent, salePercent, dev1Percent, dev2Percent, dev1Address, dev2Address, baseTokenURI).send({from:wallet_address}).on ('receipt', async function(res) {
      alert('Initialized success!')
    });
  }

  async function setBaseTokenURI() {
    var _baseTokenURI = $("#rebaseTokenURI").val();
    await NFT_contract.methods.setBaseTokenURI(_baseTokenURI).send({from:wallet_address}).on('receipt', async function(res) {
      alert("IPFS URI is set!")
    });
  }

  async function setdev1percent() {
    var _dev1percent = $("#redev1percent").val();
    await NFT_contract.methods.setDev1Percent(_dev1percent).send({from:wallet_address}).on('receipt', async function(res) {
      alert("Contract developer percent is set!")
    });
  }
  
  async function setdev2percent() {
    var _dev2percent = $("#redev2percent").val();
    await NFT_contract.methods.setDev2Percent(_dev2percent).send({from:wallet_address}).on('receipt', async function(res) {
      alert("Frontend developer percent is set!")
    });
  }
  
  async function setdev1address() {
    var _dev1address = $("#redev1address").val();
    await NFT_contract.methods.setDev1Address(_dev1address).send({from:wallet_address}).on('receipt', async function(res) {
      alert("Contract developer address is set!")
    });
  }

  async function setdev2address() {
    var _dev1address = $("#redev2address").val();
    await NFT_contract.methods.setDev2Address(_dev2address).send({from:wallet_address}).on('receipt', async function(res) {
      alert("Frontend developer address is set!")
    });
  }
  
  async function withdraw() {
    var _amount = $("#withdrawamount").val();
    await NFT_contract.methods.withdraw(_amount).send({from:wallet_address}).on('receipt', async function(res) {
      alert("Withdraw is sccessed!")
    });
  }
  
  async function startmint() {
    await NFT_contract.methods.startMint().send({from:wallet_address}).on('receipt', async function(res) {
      alert("Mint is started!")
    });
  }
  
  async function freeMint() {
    var _amount = $("#freeMintAmount").val();
    var _toAddress = $("#toAddress").val();
    await NFT_contract.methods.freeMintCPNK(_amount, _toAddress).send({from:wallet_address}).on('receipt', async function(res) {
      alert("Mint is successed!")
    });
  }

  async function claim() {
    try {
      if(wallet_connect_flag) {
        if(Number(rewards_amount) < Number(balance)) {
          var canClaim = await NFT_contract.methods.canClaim(wallet_address).call();
          if (!canClaim) {
            alert('Cannot claim now. Try later!');
            return;
          }
          else {
            await NFT_contract.methods.claimRewards(wallet_address).send({from: wallet_address}).on("receipt", async function (res) {
              alert("Transaction successful");
              try {
                total = await NFT_contract.methods.totalSupply().call();
                rewards_amount = await NFT_contract.methods.getRewardsAmount(wallet_address).call();
                $('.totalsupply').text(total + " / 5000");
                $("#rewards").text(rewards_amount);
                total_cost_view($("#eth-input").val());
                var percent = (total * 100 / 5000).toFixed(2) + "%";
                $('.progress-value').text(percent);
                if(Math.round(total * 100/ 5000) < 10) {
                  percent = "10%";
                }
                $('.progress-bar').width(percent);
                getBalance(wallet_address);
                
              } catch (err) {console.log("buy part again watch error: ", err)}
            }).on("error", function(res) {
              alert("Error in transaction");
            })
          }
        } else {
          alert("The amount of ETH in your wallet is not sufficient!");
        }
      } else {
        alert("Please connect to Songbird Mainnet!");
      }
    } catch (err) {console.log("Claim", err)}
  }

  function loading() {
    $(".modal-body").hide();
    $(".loading").show();
  }

  function unloading() {
    $(".loading").hide();
    $(".modal-body").show();
  }
});  

// countdown timer part
var deadline = new Date("2021-09-30T00:00:00+03:00").getTime();

var x = setInterval(function() {
  var now = new Date().getTime();
  var t = deadline - now;
  var days = Math.floor(t / (1000 * 60 * 60 * 24));
  var hours = Math.floor((t % (1000 * 60 * 60 * 24))/(1000 * 60 * 60));
  var minutes = Math.floor((t % (1000 * 60 * 60)) / (1000 * 60));
  var seconds = Math.floor((t % (1000 * 60)) / 1000);
}, 1000);

