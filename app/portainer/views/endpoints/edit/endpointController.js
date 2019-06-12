import { EndpointSecurityFormData } from '../../../components/endpointSecurity/porEndpointSecurityModel';

angular.module('portainer.app')
.controller('EndpointController', ['$q', '$scope', '$state', '$transition$', '$filter', 'clipboard', 'EndpointService', 'GroupService', 'TagService', 'EndpointProvider', 'Notifications',
function ($q, $scope, $state, $transition$, $filter, clipboard, EndpointService, GroupService, TagService, EndpointProvider, Notifications) {

  if (!$scope.applicationState.application.endpointManagement) {
    $state.go('portainer.endpoints');
  }

  $scope.state = {
    uploadInProgress: false,
    actionInProgress: false,
    deploymentTab: 0
  };

  $scope.formValues = {
    SecurityFormData: new EndpointSecurityFormData()
  };

  $scope.copyEdgeAgentDeploymentCommand = function() {
    if ($scope.state.deploymentTab === 0) {
      clipboard.copyText('docker run -d -v /var/run/docker.sock:/var/run/docker.sock -v /var/lib/docker/volumes:/var/lib/docker/volumes -v /:/host --restart always -e EDGE=1 -e CAP_HOST_MANAGEMENT=1 --name portainer_agent_iot portainer/pagent:edge');
    } else {
      clipboard.copyText('docker service create --name portainer_edge_agent --network portainer_agent_network -e AGENT_CLUSTER_ADDR=tasks.portainer_agent -e EDGE=1 -e CAP_HOST_MANAGEMENT=1 --mode global --constraint \'node.platform.os == linux\' --mount type=bind,src=//var/run/docker.sock,dst=/var/run/docker.sock --mount type=bind,src=//var/lib/docker/volumes,dst=/var/lib/docker/volume portainer/pagent:edge');
    }
    $('#copyNotificationDeploymentCommand').show().fadeOut(2500);
  };

  $scope.copyEdgeAgentKey = function() {
    clipboard.copyText($scope.endpoint.EdgeKey);
    $('#copyNotificationEdgeKey').show().fadeOut(2500);
  };

  $scope.updateEndpoint = function() {
    var endpoint = $scope.endpoint;
    var securityData = $scope.formValues.SecurityFormData;
    var TLS = securityData.TLS;
    var TLSMode = securityData.TLSMode;
    var TLSSkipVerify = TLS && (TLSMode === 'tls_client_noca' || TLSMode === 'tls_only');
    var TLSSkipClientVerify = TLS && (TLSMode === 'tls_ca' || TLSMode === 'tls_only');

    var payload = {
      Name: endpoint.Name,
      PublicURL: endpoint.PublicURL,
      GroupID: endpoint.GroupId,
      Tags: endpoint.Tags,
      TLS: TLS,
      TLSSkipVerify: TLSSkipVerify,
      TLSSkipClientVerify: TLSSkipClientVerify,
      TLSCACert: TLSSkipVerify || securityData.TLSCACert === endpoint.TLSConfig.TLSCACert ? null : securityData.TLSCACert,
      TLSCert: TLSSkipClientVerify || securityData.TLSCert === endpoint.TLSConfig.TLSCert ? null : securityData.TLSCert,
      TLSKey: TLSSkipClientVerify || securityData.TLSKey === endpoint.TLSConfig.TLSKey ? null : securityData.TLSKey,
      AzureApplicationID: endpoint.AzureCredentials.ApplicationID,
      AzureTenantID: endpoint.AzureCredentials.TenantID,
      AzureAuthenticationKey: endpoint.AzureCredentials.AuthenticationKey
    };

    if ($scope.endpointType !== 'local' && endpoint.Type !== 3) {
      payload.URL = 'tcp://' + endpoint.URL;
    }

    $scope.state.actionInProgress = true;
    EndpointService.updateEndpoint(endpoint.Id, payload)
    .then(function success() {
      Notifications.success('Endpoint updated', $scope.endpoint.Name);
      EndpointProvider.setEndpointPublicURL(endpoint.PublicURL);
      $state.go('portainer.endpoints', {}, {reload: true});
    }, function error(err) {
      Notifications.error('Failure', err, 'Unable to update endpoint');
      $scope.state.actionInProgress = false;
    }, function update(evt) {
      if (evt.upload) {
        $scope.state.uploadInProgress = evt.upload;
      }
    });
  };

  function initView() {
    $q.all({
      endpoint: EndpointService.endpoint($transition$.params().id),
      groups: GroupService.groups(),
      tags: TagService.tagNames()
    })
    .then(function success(data) {
      var endpoint = data.endpoint;
      if (endpoint.URL.indexOf('unix://') === 0 || endpoint.URL.indexOf('npipe://') === 0) {
        $scope.endpointType = 'local';
      } else {
        $scope.endpointType = 'remote';
      }
      endpoint.URL = $filter('stripprotocol')(endpoint.URL);
      $scope.endpoint = endpoint;
      $scope.groups = data.groups;
      $scope.availableTags = data.tags;
    })
    .catch(function error(err) {
      Notifications.error('Failure', err, 'Unable to retrieve endpoint details');
    });
  }

  initView();
}]);
