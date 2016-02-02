echo "Setting JAVA_HOME"
export JAVA_HOME=/etc/alternatives/java_sdk_1.6.0/
echo "Checking for or setting ant onto PATH"
if [ -f ant ]
then
    echo "Ant is good"
else
    export PATH=$PATH:/opt/ant/bin
fi



echo "Setting GROOVY_HOME"
export GROOVY_HOME=/opt/groovy
echo "Setting GRAILS_HOME"
export GRAILS_HOME=/opt/grails
echo "Checking for or setting grails onto PATH"
if [ -f grails ]
then
    echo "Grails is good"
else
    export PATH=$PATH:/opt/grails/bin
fi

./grailsw war target/presentationGrails.war
